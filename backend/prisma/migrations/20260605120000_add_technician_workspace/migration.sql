ALTER TABLE `Job` MODIFY `status` ENUM('SCHEDULED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED') NOT NULL DEFAULT 'SCHEDULED';

CREATE TABLE `technician_profiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `employee_code` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `designation` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `technician_profiles_user_id_key`(`user_id`),
    INDEX `technician_profiles_organization_id_idx`(`organization_id`),
    INDEX `technician_profiles_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `job_activity_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization_id` INTEGER NOT NULL,
    `job_id` INTEGER NOT NULL,
    `user_id` INTEGER NULL,
    `activity_type` ENUM('VIEWED', 'STARTED', 'PAUSED', 'RESUMED', 'COMPLETED', 'NOTE_ADDED', 'PHOTO_UPLOADED', 'SIGNATURE_CAPTURED') NOT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `job_activity_logs_organization_id_idx`(`organization_id`),
    INDEX `job_activity_logs_job_id_idx`(`job_id`),
    INDEX `job_activity_logs_user_id_idx`(`user_id`),
    INDEX `job_activity_logs_activity_type_idx`(`activity_type`),
    INDEX `job_activity_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `job_notes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization_id` INTEGER NOT NULL,
    `job_id` INTEGER NOT NULL,
    `technician_id` INTEGER NULL,
    `note` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `job_notes_organization_id_idx`(`organization_id`),
    INDEX `job_notes_job_id_idx`(`job_id`),
    INDEX `job_notes_technician_id_idx`(`technician_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `job_attachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization_id` INTEGER NOT NULL,
    `job_id` INTEGER NOT NULL,
    `technician_id` INTEGER NULL,
    `file_name` VARCHAR(191) NOT NULL,
    `file_path` VARCHAR(191) NOT NULL,
    `attachment_type` ENUM('BEFORE_PHOTO', 'AFTER_PHOTO', 'GENERAL_ATTACHMENT') NOT NULL,
    `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `job_attachments_organization_id_idx`(`organization_id`),
    INDEX `job_attachments_job_id_idx`(`job_id`),
    INDEX `job_attachments_technician_id_idx`(`technician_id`),
    INDEX `job_attachments_attachment_type_idx`(`attachment_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `job_signatures` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization_id` INTEGER NOT NULL,
    `job_id` INTEGER NOT NULL,
    `technician_id` INTEGER NULL,
    `signature_image_path` VARCHAR(191) NOT NULL,
    `signed_by_name` VARCHAR(191) NOT NULL,
    `signed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `job_signatures_organization_id_idx`(`organization_id`),
    INDEX `job_signatures_job_id_idx`(`job_id`),
    INDEX `job_signatures_technician_id_idx`(`technician_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `job_completion_checklists` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization_id` INTEGER NOT NULL,
    `job_id` INTEGER NOT NULL,
    `item_name` VARCHAR(191) NOT NULL,
    `completed` BOOLEAN NOT NULL DEFAULT false,
    `completed_at` DATETIME(3) NULL,
    INDEX `job_completion_checklists_organization_id_idx`(`organization_id`),
    INDEX `job_completion_checklists_job_id_idx`(`job_id`),
    INDEX `job_completion_checklists_completed_idx`(`completed`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `technician_profiles` ADD CONSTRAINT `technician_profiles_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `technician_profiles` ADD CONSTRAINT `technician_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `job_activity_logs` ADD CONSTRAINT `job_activity_logs_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `job_activity_logs` ADD CONSTRAINT `job_activity_logs_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `Job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `job_activity_logs` ADD CONSTRAINT `job_activity_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `job_notes` ADD CONSTRAINT `job_notes_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `job_notes` ADD CONSTRAINT `job_notes_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `Job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `job_notes` ADD CONSTRAINT `job_notes_technician_id_fkey` FOREIGN KEY (`technician_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `job_attachments` ADD CONSTRAINT `job_attachments_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `job_attachments` ADD CONSTRAINT `job_attachments_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `Job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `job_attachments` ADD CONSTRAINT `job_attachments_technician_id_fkey` FOREIGN KEY (`technician_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `job_signatures` ADD CONSTRAINT `job_signatures_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `job_signatures` ADD CONSTRAINT `job_signatures_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `Job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `job_signatures` ADD CONSTRAINT `job_signatures_technician_id_fkey` FOREIGN KEY (`technician_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `job_completion_checklists` ADD CONSTRAINT `job_completion_checklists_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `job_completion_checklists` ADD CONSTRAINT `job_completion_checklists_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `Job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO `features` (`code`, `name`, `description`, `module_group`, `status`, `created_at`, `updated_at`)
VALUES ('TECHNICIAN_WORKSPACE', 'Technician Workspace', 'Field technician workspace and job operations', 'Operations', 'ACTIVE', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `description` = VALUES(`description`), `module_group` = VALUES(`module_group`), `status` = 'ACTIVE', `updated_at` = CURRENT_TIMESTAMP(3);

INSERT IGNORE INTO `plan_features` (`plan_id`, `feature_id`, `created_at`)
SELECT `plans`.`id`, `features`.`id`, CURRENT_TIMESTAMP(3)
FROM `plans`
JOIN `features` ON `features`.`code` = 'TECHNICIAN_WORKSPACE'
WHERE `plans`.`code` IN ('DEMO', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE');
