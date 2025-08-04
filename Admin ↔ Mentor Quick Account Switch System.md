# Admin ↔ Mentor Quick Account Switch System

## 1. Problem Statement
Hamare Mentor Hub me kabhi-kabhi ek hi person ka **do role** hota hai:  
- **Admin** (jo pura system manage karta hai)  
- **Mentor** (jo students handle karta hai)  

Normal case me, isko do alag accounts milte hain aur usko **bar-bar login/logout** karke account change karna padta hai.  
Ye kaafi boring aur time waste hota hai.  

---

## 2. Our Solution
Hum ek **Quick Account Switch System** banayenge jisse:  
- **Do alag accounts** rahenge (Admin ka alag & Mentor ka alag)  
- Lekin **special linking** ki wajah se ek Admin apne linked Mentor account me **ek click** me switch kar paayega  
- Ye linking sirf **Super Admin** karega (security ke liye)  

---

## 3. Flow Design

### Step 1: Separate Accounts
Firebase Auth me do alag accounts banenge:
- `admin@college.com` → Role: `"admin"`
- `mentor@college.com` → Role: `"mentor"`

---

### Step 2: Linking via Super Admin
Super Admin panel me ek feature:
- **"Link Admin ↔ Mentor Account"** option
- Super admin dono accounts select karega (Admin ka UID & Mentor ka UID)
- Ye link ek Firestore collection me save hoga:

```json
linkedAccounts: {
  "adminUID_123": {
    "mentorUID": "mentorUID_456",
    "linkedBy": "superAdminUID_999",
    "linkedOn": "2025-08-03T12:00:00Z"
  }
}
Step 3: Admin Dashboard – Switch Option
Jab Admin login kare:

System check karega:

Kya admin ka UID linkedAccounts me hai?

Agar haan → "Switch to Mentor" ka button/card show hoga

Button click hote hi system direct Mentor account me login kara dega

Step 4: Direct Login Mechanism (Secure Way)
Password store karna risky hai, isliye hum Custom Firebase Auth Token use karenge:

Backend (Cloud Function)

Super admin ya system createCustomToken(mentorUID) banayega

Frontend (Flutter App)

dart
Copy
Edit
FirebaseAuth.instance.signInWithCustomToken(token);
Isse bina password ke Mentor account me login ho jaayega.

Step 5: Firestore Security Rules
Rules me condition lagayenge:

Agar user ka UID linkedAccounts me linked hai → allow access

Warna deny access

Example:

javascript
Copy
Edit
match /mentors/{docId} {
  allow read, write: if request.auth != null &&
    isLinkedAccount(request.auth.uid, docId);
}
4. Benefits
✅ Do accounts ka data alag-alag safe
✅ Sirf super admin hi linking kar sakta hai (secure)
✅ Ek click me account switch – no logout/login needed
✅ Password save/store nahi karna (safe method)

5. Summary
Do alag accounts (Admin & Mentor)

Super Admin linking kare

Firestore collection me link store ho

Admin dashboard me switch button show ho

Custom Firebase Token se secure login switch ho

6. Next Steps
Firestore me linkedAccounts collection create karo

Super admin panel me link option banao

Cloud Function likho jo mentor ka customToken banaye

Flutter me switch button pe custom token login ka code likho

Firestore rules me linking validation lagao