CREATE TABLE `customer_portal_users` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `organization_id` INTEGER NOT NULL,
  `customer_id` INTEGER NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NULL,
  `phone` VARCHAR(191) NULL,
  `password_hash` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
  `last_login_at` DATETIME(3) NULL,
  `invite_token` VARCHAR(191) NULL,
  `invite_expires_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `service_requests` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `organization_id` INTEGER NOT NULL,
  `customer_id` INTEGER NOT NULL,
  `portal_user_id` INTEGER NULL,
  `request_number` VARCHAR(191) NOT NULL,
  `request_type` ENUM('NEW_SERVICE', 'COMPLAINT', 'REVISIT', 'EMERGENCY', 'GENERAL') NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
  `status` ENUM('OPEN', 'IN_REVIEW', 'CONVERTED_TO_JOB', 'CLOSED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
  `related_contract_id` INTEGER NULL,
  `related_job_id` INTEGER NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `customer_portal_users_invite_token_key` ON `customer_portal_users`(`invite_token`);
CREATE UNIQUE INDEX `customer_portal_users_organization_id_email_key` ON `customer_portal_users`(`organization_id`, `email`);
CREATE UNIQUE INDEX `customer_portal_users_organization_id_phone_key` ON `customer_portal_users`(`organization_id`, `phone`);
CREATE INDEX `customer_portal_users_organization_id_idx` ON `customer_portal_users`(`organization_id`);
CREATE INDEX `customer_portal_users_customer_id_idx` ON `customer_portal_users`(`customer_id`);
CREATE INDEX `customer_portal_users_status_idx` ON `customer_portal_users`(`status`);

CREATE UNIQUE INDEX `service_requests_request_number_key` ON `service_requests`(`request_number`);
CREATE INDEX `service_requests_organization_id_idx` ON `service_requests`(`organization_id`);
CREATE INDEX `service_requests_customer_id_idx` ON `service_requests`(`customer_id`);
CREATE INDEX `service_requests_portal_user_id_idx` ON `service_requests`(`portal_user_id`);
CREATE INDEX `service_requests_request_type_idx` ON `service_requests`(`request_type`);
CREATE INDEX `service_requests_priority_idx` ON `service_requests`(`priority`);
CREATE INDEX `service_requests_status_idx` ON `service_requests`(`status`);
CREATE INDEX `service_requests_related_contract_id_idx` ON `service_requests`(`related_contract_id`);
CREATE INDEX `service_requests_related_job_id_idx` ON `service_requests`(`related_job_id`);

ALTER TABLE `customer_portal_users` ADD CONSTRAINT `customer_portal_users_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `customer_portal_users` ADD CONSTRAINT `customer_portal_users_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `service_requests` ADD CONSTRAINT `service_requests_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `service_requests` ADD CONSTRAINT `service_requests_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `service_requests` ADD CONSTRAINT `service_requests_portal_user_id_fkey` FOREIGN KEY (`portal_user_id`) REFERENCES `customer_portal_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `service_requests` ADD CONSTRAINT `service_requests_related_contract_id_fkey` FOREIGN KEY (`related_contract_id`) REFERENCES `contracts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `service_requests` ADD CONSTRAINT `service_requests_related_job_id_fkey` FOREIGN KEY (`related_job_id`) REFERENCES `Job`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
