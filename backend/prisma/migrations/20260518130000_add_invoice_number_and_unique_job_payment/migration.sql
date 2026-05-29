-- AlterTable
ALTER TABLE `Payment` ADD COLUMN `invoiceNumber` VARCHAR(191) NULL;

-- Backfill existing payments with stable invoice numbers.
UPDATE `Payment`
SET `invoiceNumber` = CONCAT('INV-', LPAD(`id`, 6, '0'))
WHERE `invoiceNumber` IS NULL;

-- AlterTable
ALTER TABLE `Payment` MODIFY `invoiceNumber` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Payment_invoiceNumber_key` ON `Payment`(`invoiceNumber`);

-- CreateIndex
CREATE UNIQUE INDEX `Payment_jobId_key` ON `Payment`(`jobId`);
