CREATE TABLE `contracts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization_id` INTEGER NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `contract_number` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NOT NULL,
    `contract_value` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `status` ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `created_by_user_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `contracts_contract_number_key`(`contract_number`),
    INDEX `contracts_organization_id_idx`(`organization_id`),
    INDEX `contracts_customer_id_idx`(`customer_id`),
    INDEX `contracts_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `contract_services` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization_id` INTEGER NOT NULL,
    `contract_id` INTEGER NOT NULL,
    `service_name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `frequency_type` ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM') NOT NULL,
    `frequency_interval` INTEGER NOT NULL DEFAULT 1,
    `total_jobs` INTEGER NOT NULL,
    `completed_jobs` INTEGER NOT NULL DEFAULT 0,
    `next_job_date` DATETIME(3) NULL,
    `preferred_time` VARCHAR(191) NULL,
    `assigned_user_id` INTEGER NULL,
    `generate_next_on_completion` BOOLEAN NOT NULL DEFAULT true,
    `status` ENUM('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `contract_services_organization_id_idx`(`organization_id`),
    INDEX `contract_services_contract_id_idx`(`contract_id`),
    INDEX `contract_services_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `contract_billing_rules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization_id` INTEGER NOT NULL,
    `contract_id` INTEGER NOT NULL,
    `billing_type` ENUM('MONTHLY', 'QUARTERLY', 'YEARLY', 'PER_VISIT', 'CUSTOM') NOT NULL,
    `billing_cycle` VARCHAR(191) NULL,
    `invoice_after_completed_jobs` INTEGER NOT NULL,
    `invoice_amount` DECIMAL(12, 2) NOT NULL,
    `last_invoiced_completed_job_count` INTEGER NOT NULL DEFAULT 0,
    `next_invoice_due_after_jobs` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `contract_billing_rules_organization_id_idx`(`organization_id`),
    INDEX `contract_billing_rules_contract_id_idx`(`contract_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `contract_job_links` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization_id` INTEGER NOT NULL,
    `contract_id` INTEGER NOT NULL,
    `contract_service_id` INTEGER NOT NULL,
    `job_id` INTEGER NOT NULL,
    `job_sequence_number` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `contract_job_links_job_id_key`(`job_id`),
    UNIQUE INDEX `contract_job_links_contract_service_id_job_sequence_number_key`(`contract_service_id`, `job_sequence_number`),
    INDEX `contract_job_links_organization_id_idx`(`organization_id`),
    INDEX `contract_job_links_contract_id_idx`(`contract_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `invoices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization_id` INTEGER NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `contract_id` INTEGER NULL,
    `billing_rule_id` INTEGER NULL,
    `invoice_number` VARCHAR(191) NOT NULL,
    `invoice_date` DATETIME(3) NOT NULL,
    `due_date` DATETIME(3) NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('DRAFT', 'GENERATED', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'GENERATED',
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `invoices_invoice_number_key`(`invoice_number`),
    INDEX `invoices_organization_id_idx`(`organization_id`),
    INDEX `invoices_customer_id_idx`(`customer_id`),
    INDEX `invoices_contract_id_idx`(`contract_id`),
    INDEX `invoices_billing_rule_id_idx`(`billing_rule_id`),
    INDEX `invoices_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `contracts` ADD CONSTRAINT `contracts_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `contract_services` ADD CONSTRAINT `contract_services_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `contract_services` ADD CONSTRAINT `contract_services_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `contract_services` ADD CONSTRAINT `contract_services_assigned_user_id_fkey` FOREIGN KEY (`assigned_user_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `contract_billing_rules` ADD CONSTRAINT `contract_billing_rules_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `contract_billing_rules` ADD CONSTRAINT `contract_billing_rules_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `contract_job_links` ADD CONSTRAINT `contract_job_links_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `contract_job_links` ADD CONSTRAINT `contract_job_links_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `contract_job_links` ADD CONSTRAINT `contract_job_links_contract_service_id_fkey` FOREIGN KEY (`contract_service_id`) REFERENCES `contract_services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `contract_job_links` ADD CONSTRAINT `contract_job_links_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `Job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_billing_rule_id_fkey` FOREIGN KEY (`billing_rule_id`) REFERENCES `contract_billing_rules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
