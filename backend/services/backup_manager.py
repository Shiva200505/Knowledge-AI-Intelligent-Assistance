"""
Backup manager for system data and configurations
"""
import asyncio
import logging
import shutil
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional
import zipfile

logger = logging.getLogger(__name__)

class BackupManager:
    """Manages system backups"""
    
    def __init__(self, backup_path: str = "./data/backups"):
        self.backup_path = Path(backup_path)
        self.backup_path.mkdir(parents=True, exist_ok=True)
        
    async def create_backup(self, backup_type: str = "full") -> Dict[str, Any]:
        """
        Create a system backup
        
        Args:
            backup_type: Type of backup (full, incremental, database, documents)
        
        Returns:
            Dict with backup info
        """
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = f"backup_{backup_type}_{timestamp}"
            backup_dir = self.backup_path / backup_name
            
            logger.info(f"Creating {backup_type} backup: {backup_name}")
            
            # Create backup directory
            backup_dir.mkdir(parents=True, exist_ok=True)
            
            backup_info = {
                "name": backup_name,
                "type": backup_type,
                "timestamp": timestamp,
                "created_at": datetime.now().isoformat(),
                "files": []
            }
            
            # Backup database
            if backup_type in ["full", "database"]:
                await self._backup_database(backup_dir, backup_info)
            
            # Backup documents
            if backup_type in ["full", "documents"]:
                await self._backup_documents(backup_dir, backup_info)
            
            # Backup settings
            if backup_type in ["full"]:
                await self._backup_settings(backup_dir, backup_info)
            
            # Create zip archive
            zip_path = self.backup_path / f"{backup_name}.zip"
            await self._create_zip(backup_dir, zip_path)
            
            # Clean up temporary directory
            shutil.rmtree(backup_dir)
            
            backup_info["archive_path"] = str(zip_path)
            backup_info["archive_size"] = zip_path.stat().st_size
            
            # Save backup manifest
            manifest_path = self.backup_path / f"{backup_name}_manifest.json"
            with open(manifest_path, 'w') as f:
                json.dump(backup_info, f, indent=2)
            
            logger.info(f"Backup created successfully: {zip_path}")
            
            return backup_info
            
        except Exception as e:
            logger.error(f"Backup creation failed: {e}")
            raise
    
    async def _backup_database(self, backup_dir: Path, backup_info: Dict):
        """Backup database files"""
        try:
            db_source = Path("data/metadata.db")
            if db_source.exists():
                db_dest = backup_dir / "metadata.db"
                shutil.copy2(db_source, db_dest)
                backup_info["files"].append({
                    "type": "database",
                    "source": str(db_source),
                    "size": db_source.stat().st_size
                })
                logger.info("Database backed up")
        except Exception as e:
            logger.error(f"Database backup failed: {e}")
    
    async def _backup_documents(self, backup_dir: Path, backup_info: Dict):
        """Backup document files"""
        try:
            docs_source = Path("data/documents")
            if docs_source.exists():
                docs_dest = backup_dir / "documents"
                shutil.copytree(docs_source, docs_dest, dirs_exist_ok=True)
                
                # Count files
                file_count = len(list(docs_dest.rglob("*")))
                backup_info["files"].append({
                    "type": "documents",
                    "source": str(docs_source),
                    "file_count": file_count
                })
                logger.info(f"Documents backed up: {file_count} files")
        except Exception as e:
            logger.error(f"Documents backup failed: {e}")
    
    async def _backup_settings(self, backup_dir: Path, backup_info: Dict):
        """Backup configuration and settings"""
        try:
            settings_files = [
                Path("data/user_settings.json"),
                Path(".env"),
                Path("backend/config/settings.py")
            ]
            
            settings_dir = backup_dir / "settings"
            settings_dir.mkdir(exist_ok=True)
            
            for source in settings_files:
                if source.exists():
                    dest = settings_dir / source.name
                    shutil.copy2(source, dest)
            
            backup_info["files"].append({
                "type": "settings",
                "file_count": len(list(settings_dir.glob("*")))
            })
            logger.info("Settings backed up")
        except Exception as e:
            logger.error(f"Settings backup failed: {e}")
    
    async def _create_zip(self, source_dir: Path, zip_path: Path):
        """Create zip archive of backup"""
        try:
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for file in source_dir.rglob("*"):
                    if file.is_file():
                        arcname = file.relative_to(source_dir)
                        zipf.write(file, arcname)
            logger.info(f"Zip archive created: {zip_path}")
        except Exception as e:
            logger.error(f"Zip creation failed: {e}")
            raise
    
    async def list_backups(self) -> list:
        """List all available backups"""
        try:
            backups = []
            for manifest_file in self.backup_path.glob("*_manifest.json"):
                with open(manifest_file, 'r') as f:
                    backup_info = json.load(f)
                    backups.append(backup_info)
            
            # Sort by timestamp (newest first)
            backups.sort(key=lambda x: x['timestamp'], reverse=True)
            
            return backups
        except Exception as e:
            logger.error(f"Failed to list backups: {e}")
            return []
    
    async def restore_backup(self, backup_name: str) -> bool:
        """
        Restore from a backup
        
        Args:
            backup_name: Name of the backup to restore
        
        Returns:
            True if successful
        """
        try:
            zip_path = self.backup_path / f"{backup_name}.zip"
            
            if not zip_path.exists():
                raise FileNotFoundError(f"Backup not found: {backup_name}")
            
            logger.info(f"Restoring backup: {backup_name}")
            
            # Create temporary extraction directory
            temp_dir = self.backup_path / "temp_restore"
            temp_dir.mkdir(exist_ok=True)
            
            # Extract zip
            with zipfile.ZipFile(zip_path, 'r') as zipf:
                zipf.extractall(temp_dir)
            
            # Restore database
            db_backup = temp_dir / "metadata.db"
            if db_backup.exists():
                shutil.copy2(db_backup, "data/metadata.db")
                logger.info("Database restored")
            
            # Restore documents
            docs_backup = temp_dir / "documents"
            if docs_backup.exists():
                shutil.copytree(docs_backup, "data/documents", dirs_exist_ok=True)
                logger.info("Documents restored")
            
            # Restore settings
            settings_backup = temp_dir / "settings" / "user_settings.json"
            if settings_backup.exists():
                shutil.copy2(settings_backup, "data/user_settings.json")
                logger.info("Settings restored")
            
            # Clean up
            shutil.rmtree(temp_dir)
            
            logger.info(f"Backup restored successfully: {backup_name}")
            return True
            
        except Exception as e:
            logger.error(f"Backup restore failed: {e}")
            return False
    
    async def delete_backup(self, backup_name: str) -> bool:
        """Delete a backup"""
        try:
            zip_path = self.backup_path / f"{backup_name}.zip"
            manifest_path = self.backup_path / f"{backup_name}_manifest.json"
            
            if zip_path.exists():
                zip_path.unlink()
            if manifest_path.exists():
                manifest_path.unlink()
            
            logger.info(f"Backup deleted: {backup_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete backup: {e}")
            return False
    
    async def cleanup_old_backups(self, keep_count: int = 10):
        """Keep only the most recent N backups"""
        try:
            backups = await self.list_backups()
            
            if len(backups) > keep_count:
                to_delete = backups[keep_count:]
                for backup in to_delete:
                    await self.delete_backup(backup['name'])
                
                logger.info(f"Cleaned up {len(to_delete)} old backups")
        except Exception as e:
            logger.error(f"Backup cleanup failed: {e}")

# Global backup manager instance
backup_manager = BackupManager()
