import { Request, Response } from 'express';

import { ChatSession } from '../models/ChatSession.js';
import { normalizeLanguage } from '../services/language.service.js';
import { resolveAnswer } from '../services/retrieval.service.js';
import { emitSessionNotification, emitSessionUpdate } from '../services/socket.service.js';

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createSessionCode() {
  return `AG-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

async function generateUniqueSessionCode() {
  let sessionCode = createSessionCode();

  while (await ChatSession.exists({ sessionCode })) {
    sessionCode = createSessionCode();
  }

  return sessionCode;
}

function toSessionSummary(session: {
  _id: string;
  sessionName?: string;
  farmerName?: string;
  expertName?: string;
  kind?: 'chat' | 'session';
  sessionCode: string;
  preferredLanguage: string;
  status: 'open' | 'answered' | 'ended';
  updatedAt: Date | string;
  lastMessagePreview?: string;
  title?: string;
}) {
  return {
    _id: session._id,
    sessionName: session.sessionName ?? session.title ?? `Session ${session.sessionCode}`,
    farmerName: session.farmerName,
    expertName: session.expertName,
    kind: session.kind ?? 'chat',
    sessionCode: session.sessionCode,
    preferredLanguage: session.preferredLanguage,
    status: session.status,
    updatedAt: session.updatedAt,
    lastMessagePreview: session.lastMessagePreview,
  };
}

export async function createChatSession(req: Request, res: Response) {
  const { sessionName, farmerName, language, ownerUid, ownerEmail, ownerPhone } = req.body as {
    sessionName?: string;
    farmerName?: string;
    language?: string;
    ownerUid?: string;
    ownerEmail?: string;
    ownerPhone?: string;
  };

  if (!sessionName?.trim()) {
    return res.status(400).json({ message: 'Session name is required.' });
  }

  const normalizedLanguage = normalizeLanguage(language);
  const sessionCode = await generateUniqueSessionCode();

  const session = await ChatSession.create({
    ownerUid: ownerUid?.trim(),
    ownerEmail: ownerEmail?.trim(),
    ownerPhone: ownerPhone?.trim(),
    farmerName: farmerName?.trim(),
    kind: 'session',
    sessionCode,
    sessionName: sessionName.trim(),
    preferredLanguage: normalizedLanguage,
    status: 'open',
    messages: [],
  });

  return res.status(201).json(session);
}

export async function joinChatSession(req: Request, res: Response) {
  const { sessionCode, ownerUid, ownerEmail, ownerPhone, farmerName } = req.body as {
    sessionCode?: string;
    ownerUid?: string;
    ownerEmail?: string;
    ownerPhone?: string;
    farmerName?: string;
  };

  if (!sessionCode?.trim()) {
    return res.status(400).json({ message: 'Session ID is required.' });
  }

  const session = await ChatSession.findOne({ sessionCode: sessionCode.trim().toUpperCase() });

  if (!session) {
    return res.status(404).json({ message: 'Session not found.' });
  }

  if (session.status === 'ended') {
    return res.status(409).json({ message: 'This session has already been ended by the expert.' });
  }

  session.ownerUid = ownerUid?.trim() || session.ownerUid;
  session.ownerEmail = ownerEmail?.trim() || session.ownerEmail;
  session.ownerPhone = ownerPhone?.trim() || session.ownerPhone;
  session.farmerName = farmerName?.trim() || session.farmerName;
  session.kind = 'session';
  session.sessionName = session.sessionName || `Session ${session.sessionCode}`;
  await session.save();

  return res.json(session);
}

export async function createFarmerMessage(req: Request, res: Response) {
  const { question, language, farmerName, sessionId, sessionCode, ownerUid, ownerEmail, ownerPhone } = req.body as {
    question?: string;
    language?: string;
    farmerName?: string;
    sessionId?: string;
    sessionCode?: string;
    ownerUid?: string;
    ownerEmail?: string;
    ownerPhone?: string;
  };

  if (!question?.trim()) {
    return res.status(400).json({ message: 'Question is required.' });
  }

  const normalizedLanguage = normalizeLanguage(language);
  const normalizedCode = sessionCode?.trim().toUpperCase();
  let session =
    (sessionId ? await ChatSession.findById(sessionId) : null) ||
    (normalizedCode ? await ChatSession.findOne({ sessionCode: normalizedCode }) : null);

  if (!session) {
    const nextSessionCode = await generateUniqueSessionCode();
    const resolvedFarmerName = farmerName?.trim();
    const sessionName = resolvedFarmerName ? `${resolvedFarmerName} Support` : `Session ${nextSessionCode}`;

    session = await ChatSession.create({
      ownerUid: ownerUid?.trim(),
      ownerEmail: ownerEmail?.trim(),
      ownerPhone: ownerPhone?.trim(),
      farmerName: resolvedFarmerName,
      kind: 'chat',
      sessionCode: nextSessionCode,
      sessionName,
      preferredLanguage: normalizedLanguage,
      status: 'open',
      messages: [],
    });
  }

  if (session.status === 'ended') {
    return res.status(409).json({ message: 'This session has ended. Join or create a new session to continue.' });
  }

  session.ownerUid = session.ownerUid ?? ownerUid?.trim();
  session.ownerEmail = session.ownerEmail ?? ownerEmail?.trim();
  session.ownerPhone = session.ownerPhone ?? ownerPhone?.trim();
  session.farmerName = farmerName?.trim() || session.farmerName;
  session.sessionName = session.sessionName || `Session ${session.sessionCode}`;
  session.preferredLanguage = normalizedLanguage;
  session.status = 'open';
  session.lastMessagePreview = question.trim();

  session.messages.push({
    messageId: createMessageId(),
    role: 'farmer',
    text: question.trim(),
    language: normalizedLanguage,
    senderName: farmerName?.trim() || session.farmerName,
    createdAt: new Date(),
  });

  const aiResponse = await resolveAnswer({
    question: question.trim(),
    language: normalizedLanguage,
  });

  session.messages.push({
    messageId: createMessageId(),
    role: 'assistant',
    text: aiResponse.answer,
    language: normalizedLanguage,
    senderName: 'Ajrasakha AI',
    source: 'ai',
    createdAt: new Date(),
  });

  await session.save();

  const responsePayload = {
    sessionId: session.id,
    session: toSessionSummary({
      _id: session.id,
      sessionName: session.sessionName,
      farmerName: session.farmerName,
      expertName: session.expertName,
      kind: session.kind,
      sessionCode: session.sessionCode,
      preferredLanguage: session.preferredLanguage,
      status: session.status,
      updatedAt: session.updatedAt,
      lastMessagePreview: session.lastMessagePreview,
    }),
    messages: session.messages,
  };

  const notificationPayload = {
    sessionId: session.id,
    sessionCode: session.sessionCode,
    title: session.sessionName,
    preview: question.trim(),
    actorRole: 'farmer' as const,
    actorName: session.farmerName,
    createdAt: new Date().toISOString(),
  };

  if (session.kind === 'session') {
    emitSessionNotification('experts', notificationPayload);
  }
  emitSessionUpdate(session.id, responsePayload, session.ownerUid);

  return res.status(201).json(responsePayload);
}

export async function createExpertReply(req: Request, res: Response) {
  const { answer, language, expertName } = req.body as {
    answer?: string;
    language?: string;
    expertName?: string;
  };

  if (!answer?.trim()) {
    return res.status(400).json({ message: 'Answer is required.' });
  }

  const session = await ChatSession.findById(req.params.sessionId);

  if (!session) {
    return res.status(404).json({ message: 'Session not found.' });
  }

  if (session.status === 'ended') {
    return res.status(409).json({ message: 'This session has already been ended.' });
  }

  const normalizedLanguage = normalizeLanguage(language ?? session.preferredLanguage);
  session.sessionName = session.sessionName || `Session ${session.sessionCode}`;
  session.expertName = expertName?.trim() || session.expertName;
  session.preferredLanguage = normalizedLanguage;
  session.status = 'answered';
  session.lastMessagePreview = answer.trim();
  session.messages.push({
    messageId: createMessageId(),
    role: 'expert',
    text: answer.trim(),
    language: normalizedLanguage,
    senderName: session.expertName,
    source: 'expert',
    createdAt: new Date(),
  });

  await session.save();

  const responsePayload = {
    sessionId: session.id,
    session: toSessionSummary({
      _id: session.id,
      sessionName: session.sessionName,
      farmerName: session.farmerName,
      expertName: session.expertName,
      kind: session.kind,
      sessionCode: session.sessionCode,
      preferredLanguage: session.preferredLanguage,
      status: session.status,
      updatedAt: session.updatedAt,
      lastMessagePreview: session.lastMessagePreview,
    }),
    messages: session.messages,
  };

  const notificationPayload = {
    sessionId: session.id,
    sessionCode: session.sessionCode,
    title: session.sessionName,
    preview: answer.trim(),
    actorRole: 'expert' as const,
    actorName: session.expertName,
    createdAt: new Date().toISOString(),
  };

  emitSessionNotification('farmer', notificationPayload, session.ownerUid);
  emitSessionUpdate(session.id, responsePayload, session.ownerUid);

  return res.status(201).json(responsePayload);
}

export async function endChatSession(req: Request, res: Response) {
  const session = await ChatSession.findById(req.params.sessionId);

  if (!session) {
    return res.status(404).json({ message: 'Session not found.' });
  }

  if (session.status === 'ended') {
    return res.json({
      sessionId: session.id,
      session: toSessionSummary({
        _id: session.id,
        sessionName: session.sessionName,
        farmerName: session.farmerName,
        expertName: session.expertName,
        kind: session.kind,
        sessionCode: session.sessionCode,
        preferredLanguage: session.preferredLanguage,
        status: session.status,
        updatedAt: session.updatedAt,
        lastMessagePreview: session.lastMessagePreview,
      }),
      messages: session.messages,
    });
  }

  const endedAt = new Date();
  const closingMessage = `${session.expertName?.trim() || 'Expert'} ended this session.`;

  session.status = 'ended';
  session.lastMessagePreview = closingMessage;
  session.messages.push({
    messageId: createMessageId(),
    role: 'assistant',
    text: closingMessage,
    language: session.preferredLanguage,
    senderName: 'Ajrasakha',
    createdAt: endedAt,
  });

  await session.save();

  const responsePayload = {
    sessionId: session.id,
    session: toSessionSummary({
      _id: session.id,
      sessionName: session.sessionName,
      farmerName: session.farmerName,
      expertName: session.expertName,
      kind: session.kind,
      sessionCode: session.sessionCode,
      preferredLanguage: session.preferredLanguage,
      status: session.status,
      updatedAt: session.updatedAt,
      lastMessagePreview: session.lastMessagePreview,
    }),
    messages: session.messages,
  };

  emitSessionNotification(
    'farmer',
    {
      sessionId: session.id,
      sessionCode: session.sessionCode,
      title: session.sessionName,
      preview: closingMessage,
      actorRole: 'expert',
      actorName: session.expertName,
      createdAt: endedAt.toISOString(),
    },
    session.ownerUid,
  );
  emitSessionUpdate(session.id, responsePayload, session.ownerUid);

  return res.json(responsePayload);
}

export async function clearChatSession(req: Request, res: Response) {
  const session = await ChatSession.findById(req.params.sessionId);

  if (!session) {
    return res.status(404).json({ message: 'Session not found.' });
  }

  session.messages.splice(0, session.messages.length);
  session.lastMessagePreview = undefined;
  await session.save();

  const responsePayload = {
    sessionId: session.id,
    session: toSessionSummary({
      _id: session.id,
      sessionName: session.sessionName,
      farmerName: session.farmerName,
      expertName: session.expertName,
      kind: session.kind,
      sessionCode: session.sessionCode,
      preferredLanguage: session.preferredLanguage,
      status: session.status,
      updatedAt: session.updatedAt,
      lastMessagePreview: session.lastMessagePreview,
    }),
    messages: session.messages,
  };

  emitSessionUpdate(session.id, responsePayload, session.ownerUid);

  return res.json(responsePayload);
}

export async function getChatSessions(req: Request, res: Response) {
  const { role, ownerUid } = req.query as { role?: string; ownerUid?: string };
  const filter: Record<string, string> = {};

  if (role === 'farmer' && ownerUid?.trim()) {
    filter.ownerUid = ownerUid.trim();
  }

  if (role === 'expert') {
    filter.kind = 'session';
  }

  const sessions = await ChatSession.find(filter).sort({ updatedAt: -1 }).lean();
  return res.json(sessions.map((session) => toSessionSummary({ ...session, _id: String(session._id) })));
}

export async function getChatSessionById(req: Request, res: Response) {
  const session = await ChatSession.findById(req.params.sessionId).lean();

  if (!session) {
    return res.status(404).json({ message: 'Session not found.' });
  }

  return res.json({
    ...session,
    _id: String(session._id),
  });
}

export async function deleteChatSession(req: Request, res: Response) {
  const session = await ChatSession.findByIdAndDelete(req.params.sessionId);

  if (!session) {
    return res.status(404).json({ message: 'Session not found.' });
  }

  return res.status(204).send();
}
