-- Migration for Agentic Workflows

ALTER TABLE tasks ADD COLUMN depends_on UUID REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN prior_context TEXT;
ALTER TABLE tasks ADD COLUMN step_index INT NOT NULL DEFAULT 0;

-- Update status check to include 'blocked'
ALTER TABLE tasks DROP CONSTRAINT tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('open', 'assigned', 'done', 'paused', 'blocked'));
