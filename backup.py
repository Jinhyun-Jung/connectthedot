import os
import time
import shutil
from datetime import datetime
import tkinter as tk
from tkinter import messagebox

class BackupHandler:
    def __init__(self):
        self.last_backup_time = 0
        self.backup_cooldown = 5  # 백업 간 최소 대기 시간(초)

    def create_backup(self, modified_file_path=None):
        main_backup_dir = "backup"
        if not os.path.exists(main_backup_dir):
            os.makedirs(main_backup_dir)

        timestamp = datetime.now().strftime("%y%m%d_%H%M%S")
        backup_dir = os.path.join(main_backup_dir, f"backup_{timestamp}")

        # Get the root directory (where the script is running)
        root_dir = "."
        
        # Walk through all directories and files
        for dirpath, dirnames, filenames in os.walk(root_dir):
            # backup 폴더(최상위)만 제외
            abs_dirpath = os.path.abspath(dirpath)
            abs_backup_dir = os.path.abspath(main_backup_dir)
            if abs_dirpath.startswith(abs_backup_dir):
                continue
                
            # Create the corresponding directory structure in backup
            relative_path = os.path.relpath(dirpath, root_dir)
            backup_path = os.path.join(backup_dir, relative_path)
            os.makedirs(backup_path, exist_ok=True)
            
            # Copy all matching files
            for filename in filenames:
                if filename.endswith((".html", ".css", ".js")):
                    source_path = os.path.join(dirpath, filename)
                    destination_path = os.path.join(backup_path, filename)
                    shutil.copy2(source_path, destination_path)
                    print(f"Backup created for: {destination_path}")


def run_gui():
    handler = BackupHandler()

    def on_backup():
        handler.create_backup()
        messagebox.showinfo("알림", "백업이 완료되었습니다.")

    root = tk.Tk()
    root.title("백업 도구")
    root.geometry("300x100")

    backup_btn = tk.Button(root, text="백업하기", command=on_backup, height=2, width=15)
    backup_btn.pack(pady=20)

    root.mainloop()

if __name__ == "__main__":
    run_gui()