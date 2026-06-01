ALTER TABLE `plans` ADD COLUMN `half_yearly_price` DECIMAL(12, 2) NOT NULL DEFAULT 0;

UPDATE `plans`
SET `half_yearly_price` = `monthly_price` * 6
WHERE `half_yearly_price` = 0;

CREATE TABLE `organization_billing_invoices` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `organization_id` INTEGER NOT NULL,
  `subscription_id` INTEGER NULL,
  `plan_id` INTEGER NOT NULL,
  `invoice_number` VARCHAR(191) NOT NULL,
  `billing_cycle` VARCHAR(191) NOT NULL,
  `period_start` DATETIME(3) NOT NULL,
  `period_end` DATETIME(3) NOT NULL,
  `invoice_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `due_date` DATETIME(3) NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `paid_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `balance_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `status` VARCHAR(191) NOT NULL DEFAULT 'GENERATED',
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `organization_billing_payments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `organization_id` INTEGER NOT NULL,
  `invoice_id` INTEGER NOT NULL,
  `payment_number` VARCHAR(191) NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `payment_method` VARCHAR(191) NOT NULL DEFAULT 'BANK_TRANSFER',
  `payment_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reference_number` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `organization_billing_invoices_invoice_number_key` ON `organization_billing_invoices`(`invoice_number`);
CREATE INDEX `organization_billing_invoices_organization_id_idx` ON `organization_billing_invoices`(`organization_id`);
CREATE INDEX `organization_billing_invoices_subscription_id_idx` ON `organization_billing_invoices`(`subscription_id`);
CREATE INDEX `organization_billing_invoices_plan_id_idx` ON `organization_billing_invoices`(`plan_id`);
CREATE INDEX `organization_billing_invoices_billing_cycle_idx` ON `organization_billing_invoices`(`billing_cycle`);
CREATE INDEX `organization_billing_invoices_status_idx` ON `organization_billing_invoices`(`status`);
CREATE INDEX `organization_billing_invoices_invoice_date_idx` ON `organization_billing_invoices`(`invoice_date`);
CREATE INDEX `organization_billing_invoices_due_date_idx` ON `organization_billing_invoices`(`due_date`);

CREATE UNIQUE INDEX `organization_billing_payments_payment_number_key` ON `organization_billing_payments`(`payment_number`);
CREATE INDEX `organization_billing_payments_organization_id_idx` ON `organization_billing_payments`(`organization_id`);
CREATE INDEX `organization_billing_payments_invoice_id_idx` ON `organization_billing_payments`(`invoice_id`);
CREATE INDEX `organization_billing_payments_payment_date_idx` ON `organization_billing_payments`(`payment_date`);

ALTER TABLE `organization_billing_invoices` ADD CONSTRAINT `organization_billing_invoices_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `organization_billing_invoices` ADD CONSTRAINT `organization_billing_invoices_subscription_id_fkey` FOREIGN KEY (`subscription_id`) REFERENCES `organization_subscriptions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `organization_billing_invoices` ADD CONSTRAINT `organization_billing_invoices_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `organization_billing_payments` ADD CONSTRAINT `organization_billing_payments_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `organization_billing_payments` ADD CONSTRAINT `organization_billing_payments_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `organization_billing_invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
