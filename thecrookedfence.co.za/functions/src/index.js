const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Resend } = require("resend");

admin.initializeApp();
const db = admin.firestore();

const BOOTSTRAP_ADMINS = [
  "bradsgbaker14@gmail.com",
  "admin@thecrookedfence.co.za",
  "stolschristopher60@gmail.com"
];

const getRoleFromContext = (context) => {
  const email = context.auth?.token?.email?.toLowerCase?.() ?? "";
  const claimRole = context.auth?.token?.role ?? null;
  if (claimRole) return claimRole;
  if (BOOTSTRAP_ADMINS.includes(email)) return "admin";
  return null;
};

const requireAdmin = (context) => {
  const role = getRoleFromContext(context);
  if (role !== "admin" && role !== "super_admin") {
    throw new functions.https.HttpsError("permission-denied", "Admin access required.");
  }
};

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY || functions.config()?.resend?.api_key;
  return apiKey ? new Resend(apiKey) : null;
};

exports.ensureCurrentUserProfile = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in required.");
  }

  const uid = context.auth.uid;
  const email = context.auth.token.email || "";
  const role = getRoleFromContext(context) ?? null;

  const userRef = db.collection("users").doc(uid);
  const snapshot = await userRef.get();

  if (!snapshot.exists) {
    await userRef.set({
      email,
      role,
      disabled: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } else {
    await userRef.set(
      {
        email,
        role: role ?? snapshot.data()?.role ?? null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  }

  return { uid, email, role };
});

exports.createAuthUser = functions.https.onCall(async (data, context) => {
  requireAdmin(context);

  const email = String(data.email || "").trim().toLowerCase();
  const role = String(data.role || "worker").trim();
  const password = String(data.password || "").trim();

  if (!email) {
    throw new functions.https.HttpsError("invalid-argument", "Email is required.");
  }

  const generatedPassword = password || `Temp${Math.random().toString(36).slice(-8)}!`;

  const userRecord = await admin.auth().createUser({
    email,
    password: generatedPassword
  });

  await admin.auth().setCustomUserClaims(userRecord.uid, { role });

  await db.collection("users").doc(userRecord.uid).set({
    email,
    role,
    disabled: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return {
    uid: userRecord.uid,
    temporaryPassword: password ? null : generatedPassword
  };
});

exports.updateAuthUserStatus = functions.https.onCall(async (data, context) => {
  requireAdmin(context);

  const uid = String(data.uid || "").trim();
  const disabled = Boolean(data.disabled);

  if (!uid) {
    throw new functions.https.HttpsError("invalid-argument", "User id is required.");
  }

  await admin.auth().updateUser(uid, { disabled });

  await db.collection("users").doc(uid).set(
    {
      disabled,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  return { uid, disabled };
});

exports.deleteAuthUser = functions.https.onCall(async (data, context) => {
  requireAdmin(context);

  const uid = String(data.uid || "").trim();
  if (!uid) {
    throw new functions.https.HttpsError("invalid-argument", "User id is required.");
  }

  await admin.auth().deleteUser(uid);
  await db.collection("users").doc(uid).delete();

  return { uid };
});

exports.deleteCategoryWithItems = functions.https.onCall(async (data, context) => {
  requireAdmin(context);

  const categoryId = String(data.categoryId || "").trim();
  if (!categoryId) {
    throw new functions.https.HttpsError("invalid-argument", "Category id is required.");
  }

  const itemsQuery = await db
    .collection("stockItems")
    .where("categoryId", "==", categoryId)
    .get();

  const batch = db.batch();
  itemsQuery.forEach((docSnap) => batch.delete(docSnap.ref));
  batch.delete(db.collection("stockCategories").doc(categoryId));

  await batch.commit();

  return { deletedItems: itemsQuery.size };
});

exports.sendTestEmail = functions.https.onCall(async (data, context) => {
  requireAdmin(context);
  const resend = getResendClient();

  if (!resend) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Resend API key is not configured."
    );
  }

  const to = Array.isArray(data?.to) ? data.to : [data?.to || ""]; 
  const subject = data?.subject || "The Crooked Fence test email";
  const html = data?.html || "<p>It works!</p>";

  const result = await resend.emails.send({
    from: data?.from || "The Crooked Fence <no-reply@thecrookedfence.co.za>",
    to,
    subject,
    html
  });

  return { id: result?.data?.id || null };
});
