-- Repositories table
CREATE TABLE repositories (
  id INT IDENTITY(1,1) PRIMARY KEY,
  github_id INT NOT NULL,
  name NVARCHAR(255) NOT NULL,
  full_name NVARCHAR(255) NOT NULL,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  CONSTRAINT UQ_repositories_github_id UNIQUE (github_id)
);

-- Users table
CREATE TABLE users (
  id INT IDENTITY(1,1) PRIMARY KEY,
  github_id INT NOT NULL,
  username NVARCHAR(255) NOT NULL,
  avatar_url NVARCHAR(1000) NULL,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  CONSTRAINT UQ_users_github_id UNIQUE (github_id)
);

-- Pull Requests table
CREATE TABLE pull_requests (
  id INT IDENTITY(1,1) PRIMARY KEY,
  github_id INT NOT NULL,
  repository_id INT NOT NULL,
  author_id INT NOT NULL,
  title NVARCHAR(500) NOT NULL,
  number INT NOT NULL,
  state NVARCHAR(50) NOT NULL,
  html_url NVARCHAR(1000) NOT NULL,
  created_at DATETIME2 NOT NULL,
  updated_at DATETIME2 NOT NULL,
  closed_at DATETIME2 NULL,
  merged_at DATETIME2 NULL,
  is_stale BIT NOT NULL DEFAULT 0,
  last_activity_at DATETIME2 NOT NULL,
  CONSTRAINT FK_pull_requests_repositories FOREIGN KEY (repository_id) REFERENCES repositories(id),
  CONSTRAINT FK_pull_requests_users FOREIGN KEY (author_id) REFERENCES users(id),
  CONSTRAINT UQ_pull_requests_github_id UNIQUE (github_id)
);

-- PR Reviews table
CREATE TABLE pr_reviews (
  id INT IDENTITY(1,1) PRIMARY KEY,
  github_id INT NOT NULL,
  pull_request_id INT NOT NULL,
  reviewer_id INT NOT NULL,
  state NVARCHAR(50) NOT NULL, -- APPROVED, CHANGES_REQUESTED, COMMENTED, DISMISSED
  submitted_at DATETIME2 NOT NULL,
  CONSTRAINT FK_pr_reviews_pull_requests FOREIGN KEY (pull_request_id) REFERENCES pull_requests(id),
  CONSTRAINT FK_pr_reviews_users FOREIGN KEY (reviewer_id) REFERENCES users(id),
  CONSTRAINT UQ_pr_reviews_github_id UNIQUE (github_id)
);

-- Review Comments table (for tracking commands)
CREATE TABLE review_comments (
  id INT IDENTITY(1,1) PRIMARY KEY,
  github_id INT NOT NULL,
  review_id INT NULL,
  pull_request_id INT NOT NULL,
  author_id INT NOT NULL,
  body NVARCHAR(MAX) NOT NULL,
  created_at DATETIME2 NOT NULL,
  updated_at DATETIME2 NOT NULL,
  contains_command BIT NOT NULL DEFAULT 0,
  command_type NVARCHAR(50) NULL,
  CONSTRAINT FK_review_comments_pr_reviews FOREIGN KEY (review_id) REFERENCES pr_reviews(id),
  CONSTRAINT FK_review_comments_pull_requests FOREIGN KEY (pull_request_id) REFERENCES pull_requests(id),
  CONSTRAINT FK_review_comments_users FOREIGN KEY (author_id) REFERENCES users(id),
  CONSTRAINT UQ_review_comments_github_id UNIQUE (github_id)
);

-- Stale PR History table (for tracking when PRs became stale)
CREATE TABLE stale_pr_history (
  id INT IDENTITY(1,1) PRIMARY KEY,
  pull_request_id INT NOT NULL,
  marked_stale_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  marked_active_at DATETIME2 NULL,
  notification_sent BIT NOT NULL DEFAULT 0,
  CONSTRAINT FK_stale_pr_history_pull_requests FOREIGN KEY (pull_request_id) REFERENCES pull_requests(id)
);

-- Create indexes for better performance
CREATE INDEX IX_pull_requests_last_activity_at ON pull_requests(last_activity_at);
CREATE INDEX IX_pull_requests_created_at ON pull_requests(created_at);
CREATE INDEX IX_pull_requests_is_stale ON pull_requests(is_stale);
CREATE INDEX IX_pr_reviews_submitted_at ON pr_reviews(submitted_at);
CREATE INDEX IX_review_comments_contains_command ON review_comments(contains_command);