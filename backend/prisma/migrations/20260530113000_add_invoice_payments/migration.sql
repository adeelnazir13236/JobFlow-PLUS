ALTER TABLE `invoices`
  MODIFY `status` ENUM('DRAFT', 'GENERATED', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'GENERATED',
  ADD COLUMN `paid_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN `balance_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN `payment_status` ENUM('DRAFT', 'GENERATED', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'GENERATED';

UPDATE `invoices`
SET `balance_amount` = `amount`
WHERE `balance_amount` = 0 AND `paid_amount` = 0;

ALTER TABLE `Payment`
  MODIFY `jobId` INTEGER NULL,
  MODIFY `totalAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  MODIFY `paymentMethod` ENUM('CASH', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'ONLINE', 'JAZZCASH', 'EASYPAISA', 'OTHER') NOT NULL DEFAULT 'CASH',
  MODIFY `paymentStatus` ENUM('PENDING', 'PARTIAL_PAID', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
  ADD COLUMN `payment_number` VARCHAR(191) NULL,
  ADD COLUMN `invoice_id` INTEGER NULL,
  ADD COLUMN `contract_id` INTEGER NULL,
  ADD COLUMN `amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN `reference_number` VARCHAR(191) NULL,
  ADD COLUMN `notes` TEXT NULL,
  ADD COLUMN `received_by_user_id` INTEGER NULL;

UPDATE `Payment`
SET `payment_number` = `invoiceNumber`, `amount` = `paidAmount`
WHERE `payment_number` IS NULL;

CREATE UNIQUE INDEX `Payment_payment_number_key` ON `Payment`(`payment_number`);
CREATE INDEX `Payment_invoice_id_idx` ON `Payment`(`invoice_id`);
CREATE INDEX `Payment_contract_id_idx` ON `Payment`(`contract_id`);
CREATE INDEX `Payment_received_by_user_id_idx` ON `Payment`(`received_by_user_id`);

ALTER TABLE `Payment` ADD CONSTRAINT `Payment_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_received_by_user_id_fkey` FOREIGN KEY (`received_by_user_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
