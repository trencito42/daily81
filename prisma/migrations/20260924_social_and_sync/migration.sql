-- AlterTable users
ALTER TABLE `users` 
  ADD COLUMN IF NOT EXISTS `username` VARCHAR(30) NULL,
  ADD COLUMN IF NOT EXISTS `stats_visibility` VARCHAR(20) NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS `activity_visibility` VARCHAR(20) NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS `allow_friend_requests` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS `allow_challenges_from` VARCHAR(20) NOT NULL DEFAULT 'everyone';

-- Backfill usernames for existing users if any
UPDATE `users` SET `username` = CONCAT('user_', SUBSTRING(id, -6)) WHERE `username` IS NULL;
ALTER TABLE `users` MODIFY `username` VARCHAR(30) NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS `users_username_key` ON `users`(`username`);

-- AlterTable game_sessions
ALTER TABLE `game_sessions`
  ADD COLUMN IF NOT EXISTS `puzzle_key` VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS `is_started` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS `version` INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS `user_puzzle_session_unique` ON `game_sessions`(`user_id`, `puzzle_id`);

-- AlterTable xp_events
CREATE TABLE IF NOT EXISTS `xp_events` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `game_session_id` VARCHAR(191) NULL,
    `amount` INTEGER NOT NULL,
    `reason` VARCHAR(50) NOT NULL,
    `idempotency_key` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `xp_events_idempotency_key_key`(`idempotency_key`),
    INDEX `xp_events_user_id_idx`(`user_id`),
    INDEX `xp_events_created_at_idx`(`created_at`),
    INDEX `xp_events_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`),
    CONSTRAINT `xp_events_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `xp_events_game_session_id_fkey` FOREIGN KEY (`game_session_id`) REFERENCES `game_sessions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable friendships
CREATE TABLE IF NOT EXISTS `friendships` (
    `id` VARCHAR(191) NOT NULL,
    `user_id_1` VARCHAR(191) NOT NULL,
    `user_id_2` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `canonical_friendship_unique`(`user_id_1`, `user_id_2`),
    INDEX `friendships_user_id_1_idx`(`user_id_1`),
    INDEX `friendships_user_id_2_idx`(`user_id_2`),
    PRIMARY KEY (`id`),
    CONSTRAINT `friendships_user_id_1_fkey` FOREIGN KEY (`user_id_1`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `friendships_user_id_2_fkey` FOREIGN KEY (`user_id_2`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable friend_requests
CREATE TABLE IF NOT EXISTS `friend_requests` (
    `id` VARCHAR(191) NOT NULL,
    `sender_id` VARCHAR(191) NOT NULL,
    `receiver_id` VARCHAR(191) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `friend_request_pair_unique`(`sender_id`, `receiver_id`),
    INDEX `friend_requests_sender_id_idx`(`sender_id`),
    INDEX `friend_requests_receiver_id_idx`(`receiver_id`),
    INDEX `friend_requests_status_idx`(`status`),
    PRIMARY KEY (`id`),
    CONSTRAINT `friend_requests_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `friend_requests_receiver_id_fkey` FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable user_blocks
CREATE TABLE IF NOT EXISTS `user_blocks` (
    `id` VARCHAR(191) NOT NULL,
    `blocker_id` VARCHAR(191) NOT NULL,
    `blocked_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_block_unique`(`blocker_id`, `blocked_id`),
    INDEX `user_blocks_blocker_id_idx`(`blocker_id`),
    INDEX `user_blocks_blocked_id_idx`(`blocked_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `user_blocks_blocker_id_fkey` FOREIGN KEY (`blocker_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `user_blocks_blocked_id_fkey` FOREIGN KEY (`blocked_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable challenges
CREATE TABLE IF NOT EXISTS `challenges` (
    `id` VARCHAR(191) NOT NULL,
    `challenger_id` VARCHAR(191) NOT NULL,
    `opponent_id` VARCHAR(191) NOT NULL,
    `mode` VARCHAR(30) NOT NULL,
    `difficulty` VARCHAR(20) NOT NULL,
    `time_limit_minutes` INTEGER NULL,
    `sprint_count` INTEGER NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `seed` VARCHAR(100) NOT NULL,
    `note` VARCHAR(100) NULL,
    `winner_id` VARCHAR(191) NULL,
    `is_tie` BOOLEAN NOT NULL DEFAULT false,
    `rematch_challenge_id` VARCHAR(191) NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `challenges_challenger_id_idx`(`challenger_id`),
    INDEX `challenges_opponent_id_idx`(`opponent_id`),
    INDEX `challenges_status_idx`(`status`),
    INDEX `challenges_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`),
    CONSTRAINT `challenges_challenger_id_fkey` FOREIGN KEY (`challenger_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `challenges_opponent_id_fkey` FOREIGN KEY (`opponent_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable challenge_rounds
CREATE TABLE IF NOT EXISTS `challenge_rounds` (
    `id` VARCHAR(191) NOT NULL,
    `challenge_id` VARCHAR(191) NOT NULL,
    `round_number` INTEGER NOT NULL,
    `puzzle_key` VARCHAR(100) NOT NULL,
    `initial_grid` VARCHAR(81) NOT NULL,
    `solution_grid` VARCHAR(81) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `challenge_round_unique`(`challenge_id`, `round_number`),
    INDEX `challenge_rounds_challenge_id_idx`(`challenge_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `challenge_rounds_challenge_id_fkey` FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable challenge_attempts
CREATE TABLE IF NOT EXISTS `challenge_attempts` (
    `id` VARCHAR(191) NOT NULL,
    `challenge_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `round_number` INTEGER NOT NULL DEFAULT 1,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_at` DATETIME(3) NULL,
    `elapsed_seconds` INTEGER NOT NULL DEFAULT 0,
    `puzzles_solved` INTEGER NOT NULL DEFAULT 0,
    `mistakes` INTEGER NOT NULL DEFAULT 0,
    `hints_used` INTEGER NOT NULL DEFAULT 0,
    `final_grid` VARCHAR(81) NULL,
    `is_completed` BOOLEAN NOT NULL DEFAULT false,
    `is_flagged` BOOLEAN NOT NULL DEFAULT false,
    `xp_awarded` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `challenge_user_round_unique`(`challenge_id`, `user_id`, `round_number`),
    INDEX `challenge_attempts_challenge_id_idx`(`challenge_id`),
    INDEX `challenge_attempts_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `challenge_attempts_challenge_id_fkey` FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `challenge_attempts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable notifications
CREATE TABLE IF NOT EXISTS `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(40) NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `message` VARCHAR(255) NOT NULL,
    `link` VARCHAR(255) NULL,
    `read` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_user_id_idx`(`user_id`),
    INDEX `notifications_user_id_read_idx`(`user_id`, `read`),
    INDEX `notifications_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`),
    CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable user_activities
CREATE TABLE IF NOT EXISTS `user_activities` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(40) NOT NULL,
    `metadata` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_activities_user_id_idx`(`user_id`),
    INDEX `user_activities_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`),
    CONSTRAINT `user_activities_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
