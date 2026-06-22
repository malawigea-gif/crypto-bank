-- AlterTable: add referral fields to User
ALTER TABLE `User`
    ADD COLUMN `referralCode` VARCHAR(191) NULL,
    ADD COLUMN `referredById` INTEGER NULL,
    ADD COLUMN `lastCommissionRunAt` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_referralCode_key` ON `User`(`referralCode`);

-- AddForeignKey: self-referential referral relation
ALTER TABLE `User` ADD CONSTRAINT `User_referredById_fkey`
    FOREIGN KEY (`referredById`) REFERENCES `User`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE `ReferralReward` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `referrerId` INTEGER NOT NULL,
    `refereeId` INTEGER NOT NULL,
    `sourceType` VARCHAR(191) NOT NULL,
    `savingsId` INTEGER NULL,
    `currency` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(20, 8) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ReferralReward` ADD CONSTRAINT `ReferralReward_referrerId_fkey`
    FOREIGN KEY (`referrerId`) REFERENCES `User`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferralReward` ADD CONSTRAINT `ReferralReward_savingsId_fkey`
    FOREIGN KEY (`savingsId`) REFERENCES `SavingsAccount`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
