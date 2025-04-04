import os
import logging
from datetime import datetime
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Define pyodbc at the module level
pyodbc = None

try:
    import pyodbc
    logger.info("Successfully imported pyodbc")
except ImportError as e:
    logger.error(f"Failed to import pyodbc: {str(e)}")
    # Temporary fallback to allow debugging
    class MockPyodbc:
        def connect(self, *args, **kwargs):
            logger.error("Using mock pyodbc connection")
            return None
    pyodbc = MockPyodbc()

class DatabaseConnection:
    
    def __init__(self):
        """Initialize database connection using environment variables"""
        try:
            # Load environment variables from .env file
            load_dotenv()
            
            # Get credentials from environment variables with no defaults
            server = os.getenv("SQL_SERVER")
            database = os.getenv("SQL_DATABASE")
            username = os.getenv("SQL_USERNAME")
            password = os.getenv("SQL_PASSWORD")
            
            # Check if any required environment variables are missing
            missing_vars = []
            if not server: missing_vars.append("SQL_SERVER")
            if not database: missing_vars.append("SQL_DATABASE")
            if not username: missing_vars.append("SQL_USERNAME")
            if not password: missing_vars.append("SQL_PASSWORD")
            
            if missing_vars:
                raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")
            
            logger.debug(f"Using database: {database} on server: {server}")
            
            # Build connection string
            conn_str = (
                f"Driver={{ODBC Driver 17 for SQL Server}};"
                f"Server=tcp:{server},1433;"
                f"Database={database};"
                f"Uid={username};"
                f"Pwd={password};"
                f"Encrypt=yes;"
                f"TrustServerCertificate=no;"
                f"Connection Timeout=30;"
            )
            
            logger.debug(f"Attempting to connect to database")
            
            # Connect to database
            self.conn = pyodbc.connect(conn_str)
            self.cursor = self.conn.cursor()
            logger.info(f"Successfully connected to Azure SQL database at {server}")
            
            # Initialize tables if they don't exist
            self._ensure_tables_exist()
            
        except ValueError as e:
            # Handle missing environment variables
            logger.error(f"Environment variable error: {str(e)}")
            self.conn = None
            self.cursor = None
            self.connection_failed = True
            logger.warning("Using mock database functionality due to missing environment variables")
        except Exception as e:
            # Handle other errors
            logger.error(f"Error connecting to database: {str(e)}")
            self.conn = None
            self.cursor = None
            self.connection_failed = True
            logger.warning("Using mock database functionality due to connection failure")
    
    def close(self):
        """Close the database connection"""
        if hasattr(self, 'conn') and self.conn:
            self.conn.close()
            logger.info("Database connection closed")
    
    def _ensure_tables_exist(self):
        """Create tables if they don't exist in the Azure SQL database"""
        try:
            # Check if the repositories table exists
            self.cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[repositories]') AND type in (N'U'))
            BEGIN
                CREATE TABLE repositories (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    github_id BIGINT UNIQUE,
                    name NVARCHAR(255) NOT NULL,
                    full_name NVARCHAR(255) NOT NULL,
                    created_at DATETIME DEFAULT GETDATE()
                )
            END
            """)
            
            # Check if the users table exists
            self.cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[users]') AND type in (N'U'))
            BEGIN
                CREATE TABLE users (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    github_id BIGINT UNIQUE,
                    username NVARCHAR(255) NOT NULL,
                    avatar_url NVARCHAR(255),
                    created_at DATETIME DEFAULT GETDATE()
                )
            END
            """)
            
            # Check if the pull_requests table exists
            self.cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[pull_requests]') AND type in (N'U'))
            BEGIN
                CREATE TABLE pull_requests (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    github_id BIGINT UNIQUE,
                    repository_id INT,
                    author_id INT,
                    title NVARCHAR(255) NOT NULL,
                    number INT NOT NULL,
                    state NVARCHAR(50) NOT NULL,
                    html_url NVARCHAR(255) NOT NULL,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    closed_at DATETIME NULL,
                    merged_at DATETIME NULL,
                    is_stale BIT DEFAULT 0,
                    last_activity_at DATETIME NOT NULL,
                    FOREIGN KEY (repository_id) REFERENCES repositories(id),
                    FOREIGN KEY (author_id) REFERENCES users(id)
                )
            END
            """)
            
            # Check if the pr_reviews table exists
            self.cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[pr_reviews]') AND type in (N'U'))
            BEGIN
                CREATE TABLE pr_reviews (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    github_id BIGINT UNIQUE,
                    pull_request_id INT,
                    reviewer_id INT,
                    state NVARCHAR(50) NOT NULL,
                    submitted_at DATETIME NOT NULL,
                    FOREIGN KEY (pull_request_id) REFERENCES pull_requests(id),
                    FOREIGN KEY (reviewer_id) REFERENCES users(id)
                )
            END
            """)
            
            # Check if the review_comments table exists
            self.cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[review_comments]') AND type in (N'U'))
            BEGIN
                CREATE TABLE review_comments (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    github_id BIGINT UNIQUE,
                    review_id INT NULL,
                    pull_request_id INT,
                    author_id INT,
                    body NVARCHAR(MAX) NOT NULL,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    contains_command BIT DEFAULT 0,
                    command_type NVARCHAR(50) NULL,
                    FOREIGN KEY (review_id) REFERENCES pr_reviews(id),
                    FOREIGN KEY (pull_request_id) REFERENCES pull_requests(id),
                    FOREIGN KEY (author_id) REFERENCES users(id)
                )
            END
            """)
            
            # Check if the stale_pr_history table exists
            self.cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[stale_pr_history]') AND type in (N'U'))
            BEGIN
                CREATE TABLE stale_pr_history (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    pull_request_id INT,
                    marked_stale_at DATETIME DEFAULT GETDATE(),
                    marked_active_at DATETIME NULL,
                    notification_sent BIT DEFAULT 0,
                    FOREIGN KEY (pull_request_id) REFERENCES pull_requests(id)
                )
            END
            """)
            
            self.conn.commit()
            logger.info("Database tables initialized successfully")
        
        except Exception as e:
            logger.error(f"Error ensuring tables exist: {str(e)}")
            if hasattr(self, 'conn') and self.conn:
                self.conn.rollback()