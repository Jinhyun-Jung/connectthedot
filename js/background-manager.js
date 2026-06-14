// 별 배경 관리 객체
const StarryBackground = {
    stars: [],

    init: function () {
        const background = document.getElementById('starBackground');
        // 기존 별 제거
        this.stars.forEach(star => star.remove());
        this.stars = [];

        // 새로운 별들 생성
        const numStars = 200;
        for (let i = 0; i < numStars; i++) {
            const x = Math.random() * window.innerWidth;
            const y = Math.random() * window.innerHeight;
            this.createStar(background, x, y);
        }

        this.animate();
    },

    createStar: function (container, x, y) {
        const star = document.createElement('div');
        star.className = 'star';

        // 랜덤 크기 (1-3px)
        const size = Math.random() * 2 + 1;

        // 랜덤 반짝임 속도 (2-6초)
        const twinkleDuration = (Math.random() * 4 + 2) + 's';

        star.style.cssText = `
            left: ${x}px;
            top: ${y}px;
            width: ${size}px;
            height: ${size}px;
            --twinkle-duration: ${twinkleDuration};
            opacity: ${Math.random() * 0.7 + 0.3};
        `;

        container.appendChild(star);
        this.stars.push(star);

        // 별의 움직임 속도 추가
        star.moveSpeed = Math.random() * 0.3 + 0.1;
        star.angle = Math.random() * Math.PI * 2;
        star.initialX = x;
        star.initialY = y;
    },

    animate: function () {
        const time = Date.now() * 0.001;

        this.stars.forEach(star => {
            // 부드러운 움직임 계산
            const moveX = Math.sin(time + star.angle) * 2;
            const moveY = Math.cos(time + star.angle) * 2;

            star.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });

        requestAnimationFrame(() => this.animate());
    }
}; 