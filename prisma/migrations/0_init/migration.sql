-- CreateTable
CREATE TABLE IF NOT EXISTS `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `display_name` VARCHAR(191) NOT NULL,
    `xp` INTEGER NOT NULL DEFAULT 0,
    `level` INTEGER NOT NULL DEFAULT 1,
    `current_streak` INTEGER NOT NULL DEFAULT 0,
    `longest_streak` INTEGER NOT NULL DEFAULT 0,
    `last_daily_date` VARCHAR(10) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `puzzles` (
    `id` VARCHAR(191) NOT NULL,
    `puzzle_key` VARCHAR(191) NOT NULL,
    `date` VARCHAR(10) NULL,
    `difficulty` VARCHAR(20) NOT NULL,
    `initial_grid` VARCHAR(81) NOT NULL,
    `solution_grid` VARCHAR(81) NOT NULL,
    `seed` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `puzzles_puzzle_key_key`(`puzzle_key`),
    INDEX `puzzles_date_idx`(`date`),
    INDEX `puzzles_difficulty_idx`(`difficulty`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `game_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `puzzle_id` VARCHAR(191) NOT NULL,
    `current_grid` VARCHAR(81) NOT NULL,
    `notes_data` TEXT NULL,
    `elapsed_seconds` INTEGER NOT NULL DEFAULT 0,
    `mistakes` INTEGER NOT NULL DEFAULT 0,
    `hints_used` INTEGER NOT NULL DEFAULT 0,
    `completed` BOOLEAN NOT NULL DEFAULT false,
    `completed_at` DATETIME(3) NULL,
    `xp_awarded` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `game_sessions_user_id_idx`(`user_id`),
    INDEX `game_sessions_puzzle_id_idx`(`puzzle_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `game_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `game_sessions_puzzle_id_fkey` FOREIGN KEY (`puzzle_id`) REFERENCES `puzzles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `daily_completions` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `puzzle_id` VARCHAR(191) NOT NULL,
    `date` VARCHAR(10) NOT NULL,
    `elapsed_seconds` INTEGER NOT NULL,
    `mistakes` INTEGER NOT NULL DEFAULT 0,
    `hints_used` INTEGER NOT NULL DEFAULT 0,
    `xp_awarded` INTEGER NOT NULL,
    `completed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `daily_completions_user_id_idx`(`user_id`),
    INDEX `daily_completions_date_idx`(`date`),
    UNIQUE INDEX `daily_completions_user_id_date_key`(`user_id`, `date`),
    PRIMARY KEY (`id`),
    CONSTRAINT `daily_completions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `daily_completions_puzzle_id_fkey` FOREIGN KEY (`puzzle_id`) REFERENCES `puzzles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
