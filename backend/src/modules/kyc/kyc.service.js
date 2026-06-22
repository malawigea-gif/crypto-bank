const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const submitKyc = async (userId, { documentType, docImage1Path, docImage2Path, facePhotoPath, signaturePath }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');
  if (user.kycStatus === 'VERIFIED') throw new Error('Account is already verified');

  const submission = await prisma.kycSubmission.upsert({
    where: { userId },
    create: { userId, documentType, docImage1Path, docImage2Path, facePhotoPath, signaturePath, status: 'PENDING' },
    update: { documentType, docImage1Path, docImage2Path, facePhotoPath, signaturePath, status: 'PENDING', rejectionReason: null, submittedAt: new Date(), reviewedAt: null, reviewedBy: null },
  });

  await prisma.user.update({ where: { id: userId }, data: { kycStatus: 'PENDING' } });

  return submission;
};

const getKycStatus = async (userId) => {
  const submission = await prisma.kycSubmission.findUnique({ where: { userId } });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { kycStatus: true } });
  return { status: user.kycStatus, submission };
};

module.exports = { submitKyc, getKycStatus };
