// ============================================================
// three-canvas-3d.js
// Connect the Dot - 3D 캔버스 렌더러
//   - window.nodes / links 데이터를 그대로 읽어 3차원 공간에 렌더링
//   - 노드 = 빛나는 구(球), 링크 = 3D 선, 제목 = 스프라이트 라벨
//   - 드래그 회전 / 휠 확대 / 우클릭(또는 Shift+드래그) 패닝
//   - 노드 클릭 시 기존 openEditor(node) 재사용 → 편집·저장 그대로 동작
//   - 2D/3D 토글 가능 (localStorage에 기억). 기본값 3D.
// 기존 2D 시스템은 건드리지 않고, 화면만 3D로 대체한다.
// ============================================================

(function () {
    'use strict';

    var ThreeCanvas3D = {
        active: false,
        inited: false,
        THREE: null,
        scene: null,
        camera: null,
        renderer: null,
        raycaster: null,
        nodeGroup: null,
        linkGroup: null,
        meshById: {},        // id -> { sphere, halo, label, node }
        linkObjects: [],
        rafId: null,
        container: null,
        center: { x: 0, y: 0 },   // 노드 좌표 중심(2D 평면 평균)
        SCALE: 0.55,              // 2D 픽셀 -> 3D 단위 축소 비율
        camAngle: { theta: 0.6, phi: 1.15, radius: 900 },        // 현재(보간되는) 값
        camAngleTarget: { theta: 0.6, phi: 1.15, radius: 900 },  // 목표 값
        camTarget: null,
        _drag: null,
        _downPos: null,
        _refreshAccum: 0,
        draggingNode: null,       // 드래그 중인 노드 레코드
        _dragPlaneZ: 0,           // 드래그 평면의 z(픽 순간 고정)
        _dragMoved: 0,            // 드래그 이동량(클릭 판정용)
        lastInteract: 0           // 마지막 입력 시각(자동 회전 지연용)
    };

    // ---- 색상 유틸 ----------------------------------------------------
    function nodeColor(node) {
        var c = node.borderColor || node.titleColor;
        if (!c && node.isFolder && typeof getFolderColor === 'function') {
            c = getFolderColor(node.folderPath || node.folder || '/');
        }
        if (!c && typeof getFolderColor === 'function') {
            c = getFolderColor(node.folder || '/');
        }
        return c || '#9C91CD';
    }

    // id 기반 결정적 깊이(z) — 2D 노트가 3D 공간에 자연스럽게 퍼지도록
    function depthFor(node) {
        var s = String(node.id);
        var h = 0;
        for (var i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
        // 폴더 경로 깊이를 한 층으로 사용 + 해시 분산
        var folderDepth = (node.folder && node.folder !== '/')
            ? node.folder.split('/').filter(Boolean).length : 0;
        var jitter = ((Math.abs(h) % 1000) / 1000 - 0.5) * 520; // -260 ~ 260
        return folderDepth * 160 + jitter;
    }

    // ---- 라벨 스프라이트 ---------------------------------------------
    function makeLabel(THREE, text, color) {
        var t = (text || '').trim();
        if (t.length > 14) t = t.slice(0, 14) + '…';
        if (!t) t = '·';
        var pad = 8, fs = 48;
        var cv = document.createElement('canvas');
        var ctx = cv.getContext('2d');
        ctx.font = '500 ' + fs + 'px "Noto Sans KR", sans-serif';
        var w = Math.ceil(ctx.measureText(t).width) + pad * 2;
        var h = fs + pad * 2;
        cv.width = w; cv.height = h;
        ctx.font = '500 ' + fs + 'px "Noto Sans KR", sans-serif';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(t, w / 2, h / 2);
        var tex = new THREE.CanvasTexture(cv);
        tex.minFilter = THREE.LinearFilter;
        var mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
        var sp = new THREE.Sprite(mat);
        var sc = 0.42;
        sp.scale.set(w * sc, h * sc, 1);
        sp.userData.aspect = w / h;
        sp.userData.baseScale = sc;
        return sp;
    }

    function radiusFor(node) {
        if (node.isFolder) return 34;
        if (node.isSpreadsheet) return 30;
        return 26 + Math.min(10, (node.title ? node.title.length : 0) * 0.4);
    }

    // ---- 초기화 ------------------------------------------------------
    ThreeCanvas3D.init = function () {
        if (this.inited) return true;
        var THREE = window.THREE;
        if (!THREE) { console.error('[3D] Three.js 가 로드되지 않았습니다.'); return false; }
        this.THREE = THREE;

        var container = document.getElementById('canvas3d');
        if (!container) {
            container = document.createElement('div');
            container.id = 'canvas3d';
            document.body.appendChild(container);
        }
        this.container = container;

        var scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x05060a, 0.00035);
        this.scene = scene;

        var W = window.innerWidth, H = window.innerHeight;
        var camera = new THREE.PerspectiveCamera(58, W / H, 1, 8000);
        this.camera = camera;
        this.camTarget = new THREE.Vector3(0, 0, 0);

        var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(W, H);
        renderer.setClearColor(0x05060a, 1);
        container.appendChild(renderer.domElement);
        this.renderer = renderer;

        this.raycaster = new THREE.Raycaster();
        this.nodeGroup = new THREE.Group();
        this.linkGroup = new THREE.Group();
        scene.add(this.linkGroup);
        scene.add(this.nodeGroup);

        // 은은한 광원
        scene.add(new THREE.AmbientLight(0xffffff, 0.85));
        var p = new THREE.PointLight(0xffffff, 0.6);
        p.position.set(300, 400, 600);
        scene.add(p);

        addStarfield(THREE, scene);

        bindControls(this);
        window.addEventListener('resize', function () { ThreeCanvas3D.onResize(); });

        this.inited = true;
        return true;
    };

    function addStarfield(THREE, scene) {
        var g = new THREE.BufferGeometry();
        var pts = [];
        for (var i = 0; i < 1400; i++) {
            pts.push((Math.random() - 0.5) * 6000, (Math.random() - 0.5) * 6000, (Math.random() - 0.5) * 6000);
        }
        g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        var m = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, transparent: true, opacity: 0.55, sizeAttenuation: true });
        scene.add(new THREE.Points(g, m));
    }

    // ---- 카메라 + 노드 드래그 컨트롤 --------------------------------
    function bindControls(self) {
        var el = self.renderer.domElement;

        el.addEventListener('mousedown', function (e) {
            self.lastInteract = performance.now();
            self._downPos = { x: e.clientX, y: e.clientY };
            self._dragMoved = 0;
            // 노드를 먼저 집는다 → 있으면 노드 이동, 없으면 카메라
            var rec = self.pickNode(e.clientX, e.clientY);
            if (rec && !(e.button === 2 || e.shiftKey)) {
                self.beginNodeDrag(rec);
            } else {
                self._drag = { x: e.clientX, y: e.clientY, pan: (e.button === 2 || e.shiftKey) };
            }
        });
        window.addEventListener('mousemove', function (e) {
            if (self.draggingNode) {
                self._dragMoved += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0);
                self.dragNodeTo(e.clientX, e.clientY);
                return;
            }
            if (!self._drag) return;
            self.lastInteract = performance.now();
            var dx = e.clientX - self._drag.x;
            var dy = e.clientY - self._drag.y;
            self._drag.x = e.clientX; self._drag.y = e.clientY;
            if (self._drag.pan) {
                self.panBy(dx, dy);
            } else {
                self.camAngleTarget.theta -= dx * 0.005;
                self.camAngleTarget.phi = clampPhi(self.camAngleTarget.phi - dy * 0.005);
            }
        });
        window.addEventListener('mouseup', function (e) {
            if (self.draggingNode) {
                var clicked = self._dragMoved < 4;
                self.endNodeDrag(clicked);
            } else if (self._drag && self._downPos) {
                var moved = Math.hypot(e.clientX - self._downPos.x, e.clientY - self._downPos.y);
                if (moved < 5) self.pick(e.clientX, e.clientY);
            }
            self._drag = null;
        });
        el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        el.addEventListener('wheel', function (e) {
            e.preventDefault();
            self.lastInteract = performance.now();
            var f = self.camAngleTarget.radius * (e.deltaY > 0 ? 0.12 : -0.12);
            self.camAngleTarget.radius = Math.max(120, Math.min(4000, self.camAngleTarget.radius + f));
        }, { passive: false });

        // 터치
        var lastTouch = null, lastDist = 0;
        el.addEventListener('touchstart', function (e) {
            self.lastInteract = performance.now();
            if (e.touches.length === 1) {
                var tx = e.touches[0].clientX, ty = e.touches[0].clientY;
                lastTouch = { x: tx, y: ty };
                self._downPos = { x: tx, y: ty };
                self._dragMoved = 0;
                var rec = self.pickNode(tx, ty);
                if (rec) self.beginNodeDrag(rec);
            } else if (e.touches.length === 2) {
                if (self.draggingNode) self.endNodeDrag(false);
                lastDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            }
        }, { passive: false });
        el.addEventListener('touchmove', function (e) {
            e.preventDefault();
            self.lastInteract = performance.now();
            if (self.draggingNode && e.touches.length === 1) {
                var t = e.touches[0];
                self._dragMoved += Math.abs(t.clientX - lastTouch.x) + Math.abs(t.clientY - lastTouch.y);
                lastTouch = { x: t.clientX, y: t.clientY };
                self.dragNodeTo(t.clientX, t.clientY);
                return;
            }
            if (e.touches.length === 1 && lastTouch) {
                var dx = e.touches[0].clientX - lastTouch.x;
                var dy = e.touches[0].clientY - lastTouch.y;
                lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                self.camAngleTarget.theta -= dx * 0.005;
                self.camAngleTarget.phi = clampPhi(self.camAngleTarget.phi - dy * 0.005);
            } else if (e.touches.length === 2) {
                var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                if (lastDist) self.camAngleTarget.radius = Math.max(120, Math.min(4000, self.camAngleTarget.radius * (lastDist / d)));
                lastDist = d;
            }
        }, { passive: false });
        el.addEventListener('touchend', function (e) {
            if (self.draggingNode && e.touches.length === 0) {
                self.endNodeDrag(self._dragMoved < 6);
            } else if (e.touches.length === 0 && self._downPos && lastTouch) {
                var moved = Math.hypot(lastTouch.x - self._downPos.x, lastTouch.y - self._downPos.y);
                if (moved < 6) self.pick(lastTouch.x, lastTouch.y);
            }
            lastTouch = null; lastDist = 0;
        });
    }

    function clampPhi(p) { return Math.max(0.15, Math.min(Math.PI - 0.15, p)); }

    ThreeCanvas3D.panBy = function (dx, dy) {
        var THREE = this.THREE;
        var right = new THREE.Vector3(), up = new THREE.Vector3();
        this.camera.matrix.extractBasis(right, up, new THREE.Vector3());
        var k = this.camAngle.radius * 0.0016;
        this.camTarget.addScaledVector(right, -dx * k);
        this.camTarget.addScaledVector(up, dy * k);
    };

    // ---- 노드 드래그 -------------------------------------------------
    ThreeCanvas3D.pickNode = function (clientX, clientY) {
        var THREE = this.THREE;
        var rect = this.renderer.domElement.getBoundingClientRect();
        var mouse = new THREE.Vector2(
            ((clientX - rect.left) / rect.width) * 2 - 1,
            -((clientY - rect.top) / rect.height) * 2 + 1
        );
        this.raycaster.setFromCamera(mouse, this.camera);
        var spheres = [];
        for (var k in this.meshById) spheres.push(this.meshById[k].sphere);
        var hits = this.raycaster.intersectObjects(spheres, false);
        if (hits.length) return this.meshById[hits[0].object.userData.nodeId];
        return null;
    };

    ThreeCanvas3D.beginNodeDrag = function (rec) {
        this.draggingNode = rec;
        this._dragPlaneZ = rec.sphere.position.z; // 픽 순간의 z로 평면 고정
        if (rec.node) rec.node.isDragging = true;  // 2D 부유 애니메이션 제외
        this.renderer.domElement.style.cursor = 'grabbing';
    };

    ThreeCanvas3D.dragNodeTo = function (clientX, clientY) {
        var THREE = this.THREE, rec = this.draggingNode;
        if (!rec) return;
        var rect = this.renderer.domElement.getBoundingClientRect();
        var mouse = new THREE.Vector2(
            ((clientX - rect.left) / rect.width) * 2 - 1,
            -((clientY - rect.top) / rect.height) * 2 + 1
        );
        this.raycaster.setFromCamera(mouse, this.camera);
        var plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -this._dragPlaneZ);
        var hit = new THREE.Vector3();
        if (!this.raycaster.ray.intersectPlane(plane, hit)) return;
        // 3D → 2D 좌표 역변환 후 노드에 반영
        var n = rec.node;
        n.x = hit.x / this.SCALE + this.center.x;
        n.y = this.center.y - hit.y / this.SCALE;
        n.baseX = n.x; n.baseY = n.y; // 부유 복귀 기준점도 갱신
    };

    ThreeCanvas3D.endNodeDrag = function (treatAsClick) {
        var rec = this.draggingNode;
        this.draggingNode = null;
        this.renderer.domElement.style.cursor = '';
        if (!rec || !rec.node) return;
        rec.node.isDragging = false;
        if (treatAsClick) {
            if (typeof openEditor === 'function') openEditor(rec.node);
            return;
        }
        // 위치를 Firebase에 저장 (2D 좌표만 저장 → 2D 화면과 호환)
        try {
            if (window.FirebaseManager && typeof window.FirebaseManager.saveNode === 'function') {
                window.FirebaseManager.saveNode(rec.node);
            }
        } catch (err) { console.warn('[3D] 노드 위치 저장 실패:', err); }
    };

    // ---- 좌표 변환 ---------------------------------------------------
    ThreeCanvas3D.to3D = function (node) {
        return {
            x: (node.x - this.center.x) * this.SCALE,
            y: -(node.y - this.center.y) * this.SCALE, // 화면 y와 3D y 반전
            z: depthFor(node) * this.SCALE
        };
    };

    // ---- 노드/링크 동기화 -------------------------------------------
    ThreeCanvas3D.refresh = function () {
        if (!this.active || !this.inited) return;
        var THREE = this.THREE;
        var nodes = (window.nodes || []).filter(function (n) { return n && !n.checked; });

        // 좌표 중심 갱신 (드래그 중에는 고정해 흔들림 방지)
        if (nodes.length && !this.draggingNode) {
            var sx = 0, sy = 0;
            for (var i = 0; i < nodes.length; i++) { sx += nodes[i].x || 0; sy += nodes[i].y || 0; }
            this.center.x = sx / nodes.length;
            this.center.y = sy / nodes.length;
        }

        var seen = {};
        for (var j = 0; j < nodes.length; j++) {
            var node = nodes[j];
            var id = String(node.id);
            seen[id] = true;
            var rec = this.meshById[id];
            var col = new THREE.Color(nodeColor(node));
            if (!rec) {
                var r = radiusFor(node);
                var sphere = new THREE.Mesh(
                    new THREE.SphereGeometry(r, 32, 32),
                    new THREE.MeshBasicMaterial({ color: col })
                );
                var halo = new THREE.Mesh(
                    new THREE.SphereGeometry(r * 1.8, 18, 18),
                    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.18, depthWrite: false })
                );
                var label = makeLabel(THREE, node.title, col);
                sphere.userData.nodeId = id;
                this.nodeGroup.add(sphere);
                this.nodeGroup.add(halo);
                this.nodeGroup.add(label);
                rec = this.meshById[id] = { sphere: sphere, halo: halo, label: label, node: node, title: node.title };
            } else {
                rec.node = node;
                rec.sphere.material.color.copy(col);
                rec.halo.material.color.copy(col);
                if (rec.title !== node.title) { // 제목 바뀌면 라벨 새로
                    this.nodeGroup.remove(rec.label);
                    rec.label.material.map.dispose();
                    rec.label.material.dispose();
                    rec.label = makeLabel(THREE, node.title, col);
                    this.nodeGroup.add(rec.label);
                    rec.title = node.title;
                }
            }
        }

        // 사라진 노드 제거
        for (var key in this.meshById) {
            if (!seen[key]) {
                var d = this.meshById[key];
                this.nodeGroup.remove(d.sphere); this.nodeGroup.remove(d.halo); this.nodeGroup.remove(d.label);
                d.sphere.geometry.dispose(); d.sphere.material.dispose();
                d.halo.geometry.dispose(); d.halo.material.dispose();
                d.label.material.map.dispose(); d.label.material.dispose();
                delete this.meshById[key];
            }
        }

        this.rebuildLinks();
    };

    ThreeCanvas3D.rebuildLinks = function () {
        var THREE = this.THREE;
        var i;
        for (i = 0; i < this.linkObjects.length; i++) {
            this.linkGroup.remove(this.linkObjects[i]);
            this.linkObjects[i].geometry.dispose();
            this.linkObjects[i].material.dispose();
        }
        this.linkObjects = [];
        // node-manager.js의 `links`는 전역 lexical binding이라 window.links에
        // 자동으로 노출되지 않는다. 지역 변수 이름으로 links를 다시 선언하면
        // 전역 값을 가려 항상 빈 배열이 되므로 별도 이름으로 읽는다.
        var linkList = Array.isArray(window.links)
            ? window.links
            : (typeof links !== 'undefined' && Array.isArray(links) ? links : []);
        for (i = 0; i < linkList.length; i++) {
            var link = linkList[i];
            var a = this.meshById[String(link.source)];
            var b = this.meshById[String(link.target)];
            if (!a || !b) continue;
            var g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
            var lineColor = link.isFolder ? a.sphere.material.color : new THREE.Color(0xd5def0);
            var m = new THREE.LineBasicMaterial({
                color: lineColor,
                transparent: true,
                opacity: link.isFolder ? 0.5 : 0.62,
                depthWrite: false
            });
            var line = new THREE.Line(g, m);
            line.userData.pair = [a.sphere, b.sphere];
            line.renderOrder = 1;
            this.linkGroup.add(line);
            this.linkObjects.push(line);
        }
    };

    // ---- 피킹(클릭 → 편집) ------------------------------------------
    ThreeCanvas3D.pick = function (clientX, clientY) {
        if (!this.active) return;
        var THREE = this.THREE;
        var rect = this.renderer.domElement.getBoundingClientRect();
        var mouse = new THREE.Vector2(
            ((clientX - rect.left) / rect.width) * 2 - 1,
            -((clientY - rect.top) / rect.height) * 2 + 1
        );
        this.raycaster.setFromCamera(mouse, this.camera);
        var spheres = [];
        for (var k in this.meshById) spheres.push(this.meshById[k].sphere);
        var hits = this.raycaster.intersectObjects(spheres, false);
        if (hits.length) {
            var id = hits[0].object.userData.nodeId;
            var rec = this.meshById[id];
            if (rec && rec.node && typeof openEditor === 'function') {
                openEditor(rec.node);
            }
        }
    };

    // ---- 렌더 루프 ---------------------------------------------------
    ThreeCanvas3D.loop = function () {
        if (!ThreeCanvas3D.active) return;
        ThreeCanvas3D.rafId = requestAnimationFrame(ThreeCanvas3D.loop);
        var self = ThreeCanvas3D;

        // 데이터는 주기적으로(약 6프레임마다) 재동기화 — 추가/삭제/제목 반영
        self._refreshAccum++;
        if (self._refreshAccum >= 6) { self._refreshAccum = 0; self.refresh(); }

        var now = performance.now();
        var t = now * 0.001;

        // 노드 위치 갱신(2D 부유 좌표 + 부드러운 z 부유)
        for (var k in self.meshById) {
            var rec = self.meshById[k];
            var p = self.to3D(rec.node);
            // 드래그 중인 노드는 흔들지 않고 손끝에 고정
            var bob = (rec === self.draggingNode) ? 0 : Math.sin(t * 0.6 + (rec.node.phase || 0)) * 10;
            var tz = p.z + bob;
            // 위치 보간으로 미세한 떨림 없이 부드럽게
            rec.sphere.position.x += (p.x - rec.sphere.position.x) * 0.25;
            rec.sphere.position.y += (p.y - rec.sphere.position.y) * 0.25;
            rec.sphere.position.z += (tz - rec.sphere.position.z) * 0.25;
            rec.halo.position.copy(rec.sphere.position);
            rec.label.position.set(rec.sphere.position.x, rec.sphere.position.y + radiusFor(rec.node) + 26, rec.sphere.position.z);
        }
        // 링크 좌표 갱신
        for (var i = 0; i < self.linkObjects.length; i++) {
            var line = self.linkObjects[i];
            var pa = line.userData.pair[0].position, pb = line.userData.pair[1].position;
            var arr = line.geometry.attributes.position.array;
            arr[0] = pa.x; arr[1] = pa.y; arr[2] = pa.z;
            arr[3] = pb.x; arr[4] = pb.y; arr[5] = pb.z;
            line.geometry.attributes.position.needsUpdate = true;
        }

        // 입력이 없으면 아주 천천히 자전(생동감)
        var idle = !self._drag && !self.draggingNode && (now - self.lastInteract > 2500);
        if (idle) self.camAngleTarget.theta += 0.0010;

        // 카메라 관성: 목표값으로 부드럽게 보간
        var a = self.camAngle, at = self.camAngleTarget, ease = 0.12;
        a.theta += (at.theta - a.theta) * ease;
        a.phi += (at.phi - a.phi) * ease;
        a.radius += (at.radius - a.radius) * ease;

        var cx = self.camTarget.x + a.radius * Math.sin(a.phi) * Math.cos(a.theta);
        var cy = self.camTarget.y + a.radius * Math.cos(a.phi);
        var cz = self.camTarget.z + a.radius * Math.sin(a.phi) * Math.sin(a.theta);
        self.camera.position.set(cx, cy, cz);
        self.camera.lookAt(self.camTarget);

        self.renderer.render(self.scene, self.camera);
    };

    ThreeCanvas3D.onResize = function () {
        if (!this.inited) return;
        var W = window.innerWidth, H = window.innerHeight;
        this.camera.aspect = W / H;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(W, H);
    };

    // ---- 표시/숨김 + 토글 -------------------------------------------
    ThreeCanvas3D.show = function () {
        if (!this.init()) return;
        this.active = true;
        this.container.style.display = 'block';
        document.body.classList.add('view-3d-active');
        this._refreshAccum = 999;
        this.refresh();
        // 카메라를 노드 분포에 맞춤
        this.fitView();
        this.loop();
        updateToggleLabel(true);
    };

    ThreeCanvas3D.hide = function () {
        this.active = false;
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = null;
        if (this.container) this.container.style.display = 'none';
        document.body.classList.remove('view-3d-active');
        updateToggleLabel(false);
        if (typeof render === 'function') render(); // 2D 화면 복구
    };

    ThreeCanvas3D.toggle = function () {
        if (this.active) { this.hide(); localStorage.setItem('view3d', '0'); }
        else { this.show(); localStorage.setItem('view3d', '1'); }
    };

    ThreeCanvas3D.fitView = function () {
        // 노드들이 화면에 들어오도록 반경 추정
        var n = Object.keys(this.meshById).length;
        this.camTarget.set(0, 0, 0);
        var radius = Math.max(500, 300 + n * 14);
        // 목표와 현재를 함께 설정해 진입 시 튐 없이 시작
        this.camAngleTarget.radius = radius; this.camAngle.radius = radius;
        this.camAngleTarget.theta = 0.7; this.camAngle.theta = 0.7;
        this.camAngleTarget.phi = 1.1; this.camAngle.phi = 1.1;
        this.lastInteract = performance.now();
    };

    function updateToggleLabel(is3D) {
        var btn = document.getElementById('view3dToggle');
        if (btn) {
            btn.classList.toggle('active', is3D);
            btn.title = is3D ? '2D로 보기' : '3D로 보기';
        }
    }

    // ---- 부팅 -------------------------------------------------------
    function boot() {
        var btn = document.getElementById('view3dToggle');
        if (btn) btn.addEventListener('click', function () { ThreeCanvas3D.toggle(); });
        // 기본값: 3D (사용자가 2D로 끄면 기억)
        var pref = localStorage.getItem('view3d');
        if (pref === null || pref === '1') {
            // 노드 로드 시간을 약간 준 뒤 진입
            setTimeout(function () { ThreeCanvas3D.show(); }, 600);
        }
    }

    window.ThreeCanvas3D = ThreeCanvas3D;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
