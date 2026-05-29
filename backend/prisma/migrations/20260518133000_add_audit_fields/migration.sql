-- AlterTable
ALTER TABLE `Customer` ADD COLUMN `createdById` INTEGER NULL,
    ADD COLUMN `updatedById` INTEGER NULL;

-- AlterTable
ALTER TABLE `Job` ADD COLUMN `createdById` INTEGER NULL,
    ADD COLUMN `updatedById` INTEGER NULL,
    ADD COLUMN `completedById` INTEGER NULL;

-- AlterTable
ALTER TABLE `Payment` ADD COLUMN `createdById` INTEGER NULL,
    ADD COLUMN `updatedById` INTEGER NULL;

-- AlterTable
ALTER TABLE `CallLog` ADD COLUMN `createdById` INTEGER NULL,
    ADD COLUMN `updatedById` INTEGER NULL;

-- AlterTable
ALTER TABLE `FollowUp` ADD COLUMN `createdById` INTEGER NULL,
    ADD COLUMN `updatedById` INTEGER NULL;

-- CreateIndex
CREATE INDEX `Customer_createdById_idx` ON `Customer`(`createdById`);
CREATE INDEX `Customer_updatedById_idx` ON `Customer`(`updatedById`);
CREATE INDEX `Job_createdById_idx` ON `Job`(`createdById`);
CREATE INDEX `Job_updatedById_idx` ON `Job`(`updatedById`);
CREATE INDEX `Job_completedById_idx` ON `Job`(`completedById`);
CREATE INDEX `Payment_createdById_idx` ON `Payment`(`createdById`);
CREATE INDEX `Payment_updatedById_idx` ON `Payment`(`updatedById`);
CREATE INDEX `CallLog_createdById_idx` ON `CallLog`(`createdById`);
CREATE INDEX `CallLog_updatedById_idx` ON `CallLog`(`updatedById`);
CREATE INDEX `FollowUp_createdById_idx` ON `FollowUp`(`createdById`);
CREATE INDEX `FollowUp_updatedById_idx` ON `FollowUp`(`updatedById`);

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Job` ADD CONSTRAINT `Job_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Job` ADD CONSTRAINT `Job_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Job` ADD CONSTRAINT `Job_completedById_fkey` FOREIGN KEY (`completedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `CallLog` ADD CONSTRAINT `CallLog_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `CallLog` ADD CONSTRAINT `CallLog_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `FollowUp` ADD CONSTRAINT `FollowUp_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `FollowUp` ADD CONSTRAINT `FollowUp_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
