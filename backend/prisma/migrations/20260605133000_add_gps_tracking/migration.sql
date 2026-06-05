ALTER TABLE `Customer` ADD COLUMN `latitude` DECIMAL(10, 7) NULL,
    ADD COLUMN `longitude` DECIMAL(10, 7) NULL;

ALTER TABLE `Job` ADD COLUMN `checked_in_at` DATETIME(3) NULL,
    ADD COLUMN `checked_out_at` DATETIME(3) NULL,
    ADD COLUMN `check_in_latitude` DECIMAL(10, 7) NULL,
    ADD COLUMN `check_in_longitude` DECIMAL(10, 7) NULL,
    ADD COLUMN `check_out_latitude` DECIMAL(10, 7) NULL,
    ADD COLUMN `check_out_longitude` DECIMAL(10, 7) NULL,
    ADD COLUMN `location_verified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `location_verification_status` ENUM('NOT_CHECKED', 'VERIFIED', 'OUT_OF_RANGE', 'LOCATION_NOT_AVAILABLE') NOT NULL DEFAULT 'NOT_CHECKED';

ALTER TABLE `job_activity_logs` MODIFY `activity_type` ENUM('VIEWED', 'STARTED', 'PAUSED', 'RESUMED', 'COMPLETED', 'NOTE_ADDED', 'PHOTO_UPLOADED', 'SIGNATURE_CAPTURED', 'CHECKED_IN', 'CHECKED_OUT') NOT NULL;

CREATE TABLE `job_location_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization_id` INTEGER NOT NULL,
    `job_id` INTEGER NOT NULL,
    `technician_id` INTEGER NULL,
    `event_type` ENUM('CHECK_IN', 'CHECK_OUT') NOT NULL,
    `latitude` DECIMAL(10, 7) NOT NULL,
    `longitude` DECIMAL(10, 7) NOT NULL,
    `accuracy` DECIMAL(10, 2) NULL,
    `distance_from_job_location` DECIMAL(12, 2) NULL,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `captured_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `job_location_logs_organization_id_idx`(`organization_id`),
    INDEX `job_location_logs_job_id_idx`(`job_id`),
    INDEX `job_location_logs_technician_id_idx`(`technician_id`),
    INDEX `job_location_logs_event_type_idx`(`event_type`),
    INDEX `job_location_logs_captured_at_idx`(`captured_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `job_location_logs` ADD CONSTRAINT `job_location_logs_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `job_location_logs` ADD CONSTRAINT `job_location_logs_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `Job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `job_location_logs` ADD CONSTRAINT `job_location_logs_technician_id_fkey` FOREIGN KEY (`technician_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `features` (`code`, `name`, `description`, `module_group`, `status`, `created_at`, `updated_at`)
VALUES ('GPS_TRACKING', 'GPS Tracking', 'Technician job check-in and check-out geo verification', 'Operations', 'ACTIVE', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `description` = VALUES(`description`), `module_group` = VALUES(`module_group`), `status` = 'ACTIVE', `updated_at` = CURRENT_TIMESTAMP(3);

INSERT IGNORE INTO `plan_features` (`plan_id`, `feature_id`, `created_at`)
SELECT `plans`.`id`, `features`.`id`, CURRENT_TIMESTAMP(3)
FROM `plans`
JOIN `features` ON `features`.`code` = 'GPS_TRACKING'
WHERE `plans`.`code` IN ('PROFESSIONAL', 'ENTERPRISE');
