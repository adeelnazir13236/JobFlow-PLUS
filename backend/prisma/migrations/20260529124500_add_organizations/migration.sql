-- Create organization table for SaaS tenant isolation.
CREATE TABLE `organizations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `plan` VARCHAR(191) NOT NULL DEFAULT 'FREE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `organizations` (`name`, `email`, `phone`, `address`, `status`, `plan`, `created_at`, `updated_at`)
VALUES ('JobFlow PLUS Default Organization', 'admin@jobflowplus.com', NULL, NULL, 'ACTIVE', 'PLUS', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

SET @default_organization_id = LAST_INSERT_ID();

ALTER TABLE `User` MODIFY `role` ENUM('SYSTEM_ADMIN', 'ADMIN', 'AGENT', 'STAFF') NOT NULL DEFAULT 'STAFF';
ALTER TABLE `User` ADD COLUMN `organization_id` INTEGER NULL;

UPDATE `User`
SET `organization_id` = @default_organization_id
WHERE `organization_id` IS NULL;

ALTER TABLE `Customer` ADD COLUMN `organization_id` INTEGER NULL;
ALTER TABLE `CustomerSystem` ADD COLUMN `organization_id` INTEGER NULL;
ALTER TABLE `Job` ADD COLUMN `organization_id` INTEGER NULL;
ALTER TABLE `Payment` ADD COLUMN `organization_id` INTEGER NULL;
ALTER TABLE `CallLog` ADD COLUMN `organization_id` INTEGER NULL;
ALTER TABLE `FollowUp` ADD COLUMN `organization_id` INTEGER NULL;

UPDATE `Customer`
SET `organization_id` = @default_organization_id
WHERE `organization_id` IS NULL;

UPDATE `CustomerSystem` cs
JOIN `Customer` c ON c.`id` = cs.`customerId`
SET cs.`organization_id` = c.`organization_id`
WHERE cs.`organization_id` IS NULL;

UPDATE `Job` j
JOIN `Customer` c ON c.`id` = j.`customerId`
SET j.`organization_id` = c.`organization_id`
WHERE j.`organization_id` IS NULL;

UPDATE `Payment` p
JOIN `Customer` c ON c.`id` = p.`customerId`
SET p.`organization_id` = c.`organization_id`
WHERE p.`organization_id` IS NULL;

UPDATE `CallLog` cl
JOIN `Customer` c ON c.`id` = cl.`customerId`
SET cl.`organization_id` = c.`organization_id`
WHERE cl.`organization_id` IS NULL;

UPDATE `FollowUp` fu
JOIN `Customer` c ON c.`id` = fu.`customerId`
SET fu.`organization_id` = c.`organization_id`
WHERE fu.`organization_id` IS NULL;

ALTER TABLE `Customer` MODIFY `organization_id` INTEGER NOT NULL;
ALTER TABLE `CustomerSystem` MODIFY `organization_id` INTEGER NOT NULL;
ALTER TABLE `Job` MODIFY `organization_id` INTEGER NOT NULL;
ALTER TABLE `Payment` MODIFY `organization_id` INTEGER NOT NULL;
ALTER TABLE `CallLog` MODIFY `organization_id` INTEGER NOT NULL;
ALTER TABLE `FollowUp` MODIFY `organization_id` INTEGER NOT NULL;

CREATE INDEX `User_organization_id_idx` ON `User`(`organization_id`);
CREATE INDEX `Customer_organization_id_idx` ON `Customer`(`organization_id`);
CREATE INDEX `CustomerSystem_organization_id_idx` ON `CustomerSystem`(`organization_id`);
CREATE INDEX `Job_organization_id_idx` ON `Job`(`organization_id`);
CREATE INDEX `Payment_organization_id_idx` ON `Payment`(`organization_id`);
CREATE INDEX `CallLog_organization_id_idx` ON `CallLog`(`organization_id`);
CREATE INDEX `FollowUp_organization_id_idx` ON `FollowUp`(`organization_id`);

ALTER TABLE `User` ADD CONSTRAINT `User_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CustomerSystem` ADD CONSTRAINT `CustomerSystem_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Job` ADD CONSTRAINT `Job_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CallLog` ADD CONSTRAINT `CallLog_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `FollowUp` ADD CONSTRAINT `FollowUp_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
