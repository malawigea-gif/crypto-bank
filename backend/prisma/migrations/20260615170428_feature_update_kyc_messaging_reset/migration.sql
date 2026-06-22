-- AlterTable
ALTER TABLE `user` ADD COLUMN `country` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `firstName` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `lastName` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `phoneCountry` VARCHAR(191) NOT NULL DEFAULT '',
    MODIFY `fullName` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `KycSubmission` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `documentType` ENUM('NIC', 'PASSPORT', 'DRIVING_LICENSE', 'OTHER') NOT NULL,
    `docImage1Path` VARCHAR(191) NOT NULL,
    `docImage2Path` VARCHAR(191) NOT NULL,
    `facePhotoPath` VARCHAR(191) NOT NULL,
    `signaturePath` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `rejectionReason` VARCHAR(191) NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL,
    `reviewedBy` INTEGER NULL,

    UNIQUE INDEX `KycSubmission_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Message` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `sender` ENUM('USER', 'ADMIN') NOT NULL,
    `body` TEXT NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PasswordResetRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `documentPath` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'USED') NOT NULL DEFAULT 'PENDING',
    `resetToken` VARCHAR(191) NULL,
    `tokenExpires` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedBy` INTEGER NULL,
    `reviewedAt` DATETIME(3) NULL,

    UNIQUE INDEX `PasswordResetRequest_resetToken_key`(`resetToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `KycSubmission` ADD CONSTRAINT `KycSubmission_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
