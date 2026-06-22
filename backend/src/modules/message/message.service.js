const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const sendUserMessage = async (userId, body) => {
  if (!body?.trim()) throw new Error('Message body is required');
  return await prisma.message.create({
    data: { userId, sender: 'USER', body: body.trim() },
  });
};

const getUserThread = async (userId) => {
  await prisma.message.updateMany({
    where: { userId, sender: 'ADMIN', isRead: false },
    data: { isRead: true },
  });
  return await prisma.message.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
};

const listUserThreads = async () => {
  const threads = await prisma.message.groupBy({
    by: ['userId'],
    _count: true,
    orderBy: { _count: { userId: 'desc' } },
  });

  const unreadCounts = await prisma.message.groupBy({
    by: ['userId'],
    where: { sender: 'USER', isRead: false },
    _count: true,
  });

  const unreadMap = Object.fromEntries(unreadCounts.map(u => [u.userId, u._count]));

  const users = await prisma.user.findMany({
    where: { id: { in: threads.map(t => t.userId) } },
    select: { id: true, firstName: true, lastName: true, fullName: true, email: true },
  });

  return users.map(u => ({
    ...u,
    displayName: u.firstName ? `${u.firstName} ${u.lastName}`.trim() : (u.fullName || u.email),
    unreadCount: unreadMap[u.id] || 0,
  }));
};

const getAdminThread = async (userId) => {
  await prisma.message.updateMany({
    where: { userId: parseInt(userId), sender: 'USER', isRead: false },
    data: { isRead: true },
  });
  return await prisma.message.findMany({
    where: { userId: parseInt(userId) },
    orderBy: { createdAt: 'asc' },
  });
};

const sendAdminMessage = async (userId, body) => {
  if (!body?.trim()) throw new Error('Message body is required');
  const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
  if (!user) throw new Error('User not found');
  return await prisma.message.create({
    data: { userId: parseInt(userId), sender: 'ADMIN', body: body.trim() },
  });
};

module.exports = { sendUserMessage, getUserThread, listUserThreads, getAdminThread, sendAdminMessage };
