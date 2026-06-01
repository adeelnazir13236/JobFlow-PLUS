CREATE TABLE `quotations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization_id` INTEGER NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `quotation_number` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `quotation_date` DATETIME(3) NOT NULL,
    `valid_until` DATETIME(3) NULL,
    `status` ENUM('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `subtotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discount_type` ENUM('FIXED', 'PERCENTAGE') NULL,
    `discount_value` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discount_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `tax_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `tax_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `total_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `terms` TEXT NULL,
    `converted_to_type` ENUM('JOB', 'CONTRACT') NULL,
    `converted_job_id` INTEGER NULL,
    `converted_contract_id` INTEGER NULL,
    `created_by_user_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `quotations_quotation_number_key`(`quotation_number`),
    UNIQUE INDEX `quotations_converted_job_id_key`(`converted_job_id`),
    UNIQUE INDEX `quotations_converted_contract_id_key`(`converted_contract_id`),
    INDEX `quotations_organization_id_idx`(`organization_id`),
    INDEX `quotations_customer_id_idx`(`customer_id`),
    INDEX `quotations_status_idx`(`status`),
    INDEX `quotations_quotation_date_idx`(`quotation_date`),
    INDEX `quotations_valid_until_idx`(`valid_until`),
    INDEX `quotations_created_by_user_id_idx`(`created_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `quotation_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization_id` INTEGER NOT NULL,
    `quotation_id` INTEGER NOT NULL,
    `item_name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `quantity` DECIMAL(12, 2) NOT NULL DEFAULT 1,
    `unit_price` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `line_total` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `quotation_items_organization_id_idx`(`organization_id`),
    INDEX `quotation_items_quotation_id_idx`(`quotation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `quotations` ADD CONSTRAINT `quotations_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_converted_job_id_fkey` FOREIGN KEY (`converted_job_id`) REFERENCES `Job`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_converted_contract_id_fkey` FOREIGN KEY (`converted_contract_id`) REFERENCES `contracts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `quotation_items` ADD CONSTRAINT `quotation_items_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `quotation_items` ADD CONSTRAINT `quotation_items_quotation_id_fkey` FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
