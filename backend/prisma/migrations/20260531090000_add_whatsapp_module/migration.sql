CREATE TABLE `whatsapp_settings` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `organization_id` INTEGER NOT NULL,
  `provider_type` VARCHAR(191) NOT NULL DEFAULT 'MOCK',
  `api_key` TEXT NULL,
  `access_token` TEXT NULL,
  `phone_number_id` VARCHAR(191) NULL,
  `business_account_id` VARCHAR(191) NULL,
  `sender_number` VARCHAR(191) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `whatsapp_templates` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `organization_id` INTEGER NOT NULL,
  `template_code` VARCHAR(191) NOT NULL,
  `template_name` VARCHAR(191) NOT NULL,
  `category` VARCHAR(191) NULL,
  `message_body` TEXT NOT NULL,
  `is_system_template` BOOLEAN NOT NULL DEFAULT false,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `whatsapp_message_logs` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `organization_id` INTEGER NOT NULL,
  `customer_id` INTEGER NULL,
  `job_id` INTEGER NULL,
  `contract_id` INTEGER NULL,
  `invoice_id` INTEGER NULL,
  `quotation_id` INTEGER NULL,
  `payment_id` INTEGER NULL,
  `phone_number` VARCHAR(191) NOT NULL,
  `template_code` VARCHAR(191) NOT NULL,
  `message_body` TEXT NOT NULL,
  `provider_type` VARCHAR(191) NOT NULL,
  `provider_message_id` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `error_message` TEXT NULL,
  `sent_at` DATETIME(3) NULL,
  `delivered_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `whatsapp_settings_organization_id_idx` ON `whatsapp_settings`(`organization_id`);
CREATE UNIQUE INDEX `whatsapp_templates_organization_id_template_code_key` ON `whatsapp_templates`(`organization_id`, `template_code`);
CREATE INDEX `whatsapp_templates_organization_id_idx` ON `whatsapp_templates`(`organization_id`);
CREATE INDEX `whatsapp_templates_template_code_idx` ON `whatsapp_templates`(`template_code`);
CREATE INDEX `whatsapp_message_logs_organization_id_idx` ON `whatsapp_message_logs`(`organization_id`);
CREATE INDEX `whatsapp_message_logs_customer_id_idx` ON `whatsapp_message_logs`(`customer_id`);
CREATE INDEX `whatsapp_message_logs_job_id_idx` ON `whatsapp_message_logs`(`job_id`);
CREATE INDEX `whatsapp_message_logs_contract_id_idx` ON `whatsapp_message_logs`(`contract_id`);
CREATE INDEX `whatsapp_message_logs_invoice_id_idx` ON `whatsapp_message_logs`(`invoice_id`);
CREATE INDEX `whatsapp_message_logs_quotation_id_idx` ON `whatsapp_message_logs`(`quotation_id`);
CREATE INDEX `whatsapp_message_logs_payment_id_idx` ON `whatsapp_message_logs`(`payment_id`);
CREATE INDEX `whatsapp_message_logs_template_code_idx` ON `whatsapp_message_logs`(`template_code`);
CREATE INDEX `whatsapp_message_logs_status_idx` ON `whatsapp_message_logs`(`status`);
CREATE INDEX `whatsapp_message_logs_created_at_idx` ON `whatsapp_message_logs`(`created_at`);

ALTER TABLE `whatsapp_settings` ADD CONSTRAINT `whatsapp_settings_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `whatsapp_templates` ADD CONSTRAINT `whatsapp_templates_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `whatsapp_message_logs` ADD CONSTRAINT `whatsapp_message_logs_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `whatsapp_message_logs` ADD CONSTRAINT `whatsapp_message_logs_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `whatsapp_message_logs` ADD CONSTRAINT `whatsapp_message_logs_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `Job`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `whatsapp_message_logs` ADD CONSTRAINT `whatsapp_message_logs_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `whatsapp_message_logs` ADD CONSTRAINT `whatsapp_message_logs_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `whatsapp_message_logs` ADD CONSTRAINT `whatsapp_message_logs_quotation_id_fkey` FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `whatsapp_message_logs` ADD CONSTRAINT `whatsapp_message_logs_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
