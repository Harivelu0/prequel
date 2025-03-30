// This file defines the database schema using TypeScript interfaces
// and includes SQL scripts to create the corresponding tables

export const createTablesScript = `
-- Organizations table
CREATE TABLE Organizations (
    OrgId INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    GitHubId NVARCHAR(100) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT UQ_Organizations_GitHubId UNIQUE (GitHubId)
);

-- Repositories table
CREATE TABLE Repositories (
    RepoId INT IDENTITY(1,1) PRIMARY KEY,
    OrgId INT NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    GitHubId NVARCHAR(100) NOT NULL,
    IsPrivate BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_Repositories_Organizations FOREIGN KEY (OrgId) REFERENCES Organizations(OrgId),
    CONSTRAINT UQ_Repositories_GitHubId UNIQUE (GitHubId)
);

-- TeamMembers table
CREATE TABLE TeamMembers (
    MemberId INT IDENTITY(1,1) PRIMARY KEY,
    OrgId INT NOT NULL,
    Username NVARCHAR(100) NOT NULL,
    DisplayName NVARCHAR(100),
    Email NVARCHAR(100),
    GitHubId NVARCHAR(100) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_TeamMembers_Organizations FOREIGN KEY (OrgId) REFERENCES Organizations(OrgId),
    CONSTRAINT UQ_TeamMembers_GitHubId UNIQUE (GitHubId)
);

-- PullRequests table
CREATE TABLE PullRequests (
    PRId INT IDENTITY(1,1) PRIMARY KEY,
    RepoId INT NOT NULL,
    Number INT NOT NULL,
    Title NVARCHAR(255) NOT NULL,
    Description NVARCHAR(MAX),
    CreatorId INT NOT NULL,
    State NVARCHAR(20) NOT NULL, -- open, closed, merged
    CreatedAt DATETIME2 NOT NULL,
    UpdatedAt DATETIME2 NOT NULL,
    ClosedAt DATETIME2,
    MergedAt DATETIME2,
    CONSTRAINT FK_PullRequests_Repositories FOREIGN KEY (RepoId) REFERENCES Repositories(RepoId),
    CONSTRAINT FK_PullRequests_TeamMembers FOREIGN KEY (CreatorId) REFERENCES TeamMembers(MemberId),
    CONSTRAINT UQ_PullRequests_RepoNumber UNIQUE (RepoId, Number)
);

-- PRReviews table
CREATE TABLE PRReviews (
    ReviewId INT IDENTITY(1,1) PRIMARY KEY,
    PRId INT NOT NULL,
    ReviewerId INT NOT NULL,
    State NVARCHAR(20) NOT NULL, -- APPROVED, CHANGES_REQUESTED, COMMENTED
    SubmittedAt DATETIME2 NOT NULL,
    CONSTRAINT FK_PRReviews_PullRequests FOREIGN KEY (PRId) REFERENCES PullRequests(PRId),
    CONSTRAINT FK_PRReviews_TeamMembers FOREIGN KEY (ReviewerId) REFERENCES TeamMembers(MemberId)
);

-- PRMetrics table for calculated metrics
CREATE TABLE PRMetrics (
    MetricId INT IDENTITY(1,1) PRIMARY KEY,
    PRId INT NOT NULL,
    TimeToFirstReview INT, -- In minutes
    TimeToMerge INT, -- In minutes
    NumReviewers INT NOT NULL DEFAULT 0,
    NumComments INT NOT NULL DEFAULT 0,
    NumFileChanges INT NOT NULL DEFAULT 0,
    NumLinesAdded INT NOT NULL DEFAULT 0,
    NumLinesRemoved INT NOT NULL DEFAULT 0,
    IsStale BIT NOT NULL DEFAULT 0,
    LastCalculatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_PRMetrics_PullRequests FOREIGN KEY (PRId) REFERENCES PullRequests(PRId)
);
`;

// TypeScript interfaces matching the database schema
export interface Organization {
  orgId?: number;
  name: string;
  gitHubId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Repository {
  repoId?: number;
  orgId: number;
  name: string;
  gitHubId: string;
  isPrivate: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TeamMember {
  memberId?: number;
  orgId: number;
  username: string;
  displayName?: string;
  email?: string;
  gitHubId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PullRequest {
  prId?: number;
  repoId: number;
  number: number;
  title: string;
  description?: string;
  creatorId: number;
  state: 'open' | 'closed' | 'merged';
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  mergedAt?: Date;
}

export interface PRReview {
  reviewId?: number;
  prId: number;
  reviewerId: number;
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED';
  submittedAt: Date;
}

export interface PRMetrics {
  metricId?: number;
  prId: number;
  timeToFirstReview?: number;
  timeToMerge?: number;
  numReviewers: number;
  numComments: number;
  numFileChanges: number;
  numLinesAdded: number;
  numLinesRemoved: number;
  isStale: boolean;
  lastCalculatedAt: Date;
}