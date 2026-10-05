# FOUNDER EXIT TEST

**Date:** 24 September 2026  
**Simulation only:** Ankur’s access disappears immediately after closing. No accounts were revoked.

**Result: FAIL.** The buyer could clone public source. Production would not stay operable.

---

### Source
**FAILURE:** Buyer is not GitHub Owner/Admin.  
**WHY:** Only listed collaborator is `ankur6779`.  
**OWNER ACTION:** Transfer repo or add buyer admin first.  
**BUYER ACTION:** Create org; accept transfer.  
**EVIDENCE REQUIRED:** `gh` showing buyer Owner.  
**ACCEPTANCE TEST:** Buyer push/workflow without `ankur6779`.

### Deploy
**FAILURE:** Actions secrets + Coolify git hook + CF token + Hetzner SSH are founder-held. Workflow hard-codes `ankur6779/Amynest-live`.  
**WHY:** See `GITHUB_HANDOVER.md`.  
**OWNER ACTION:** Recreate secrets on buyer repo; disclose Coolify git method; edit repository gate.  
**BUYER ACTION:** New tokens; confirm Coolify watches new remote.  
**EVIDENCE REQUIRED:** Green Actions run on buyer secrets; Coolify deploy from buyer push.  
**ACCEPTANCE TEST:** Buyer-triggered Pages + Worker + API image update.

### Database
**FAILURE:** Host UNKNOWN; no escrowed dump; restore untested 24 Sep.  
**WHY:** `DATABASE_HANDOVER.md`.  
**OWNER ACTION:** Encrypted dump + host disclosure (offline).  
**BUYER ACTION:** Scratch Postgres restore.  
**EVIDENCE REQUIRED:** Row-count note + app R/W.  
**ACCEPTANCE TEST:** Fresh backup restored into isolated scratch environment; app connects and performs basic read/write smoke test.

### Storage (GCS)
**FAILURE:** SA JSON on founder Coolify/GH.  
**WHY:** `GCS_SERVICE_ACCOUNT_JSON` not escrowed to buyer.  
**OWNER ACTION:** GCP IAM to buyer **or** object inventory + copy.  
**BUYER ACTION:** New SA; `healthz/audio`.  
**EVIDENCE REQUIRED:** Buyer can `ls` `amynest-audio-storage`.  
**ACCEPTANCE TEST:** Audio probe PASS on buyer key.

### DNS
**FAILURE:** Registrar UNKNOWN; CF account UNKNOWN.  
**WHY:** Use verified; title not.  
**OWNER ACTION:** Auth code + CF invite.  
**BUYER ACTION:** Accept `.in` + zone.  
**EVIDENCE REQUIRED:** Buyer WHOIS / CF member list.  
**ACCEPTANCE TEST:** Buyer changes a TXT record that resolves.

### Email
**FAILURE:** `support@` mailbox UNKNOWN; alerts example is founder Gmail.  
**WHY:** `DOMAIN_EMAIL_HANDOVER.md`.  
**OWNER ACTION:** Disclose MX provider; change `ADMIN_ALERT_EMAIL`.  
**BUYER ACTION:** New mailbox.  
**EVIDENCE REQUIRED:** Received test to support@ and digest.  
**ACCEPTANCE TEST:** Founder Gmail no longer required.

### Stores
**FAILURE:** Play/ASC still founder-gated; enrollment only SELLER-STATED.  
**WHY:** Transfers not started; eligibility UNKNOWN.  
**OWNER ACTION:** Start Play + Apple app transfers.  
**BUYER ACTION:** Enroll developer accounts; accept.  
**EVIDENCE REQUIRED:** Vendor transfer-complete notices.  
**ACCEPTANCE TEST:** Buyer opens consoles as owner.

### Signing
**FAILURE:** iOS distribution private key is not buyer-portable (SB-I01 OPEN: profiles escrowed; PKCS12 passphrase / keychain export missing). Android upload keystore **ESCROWED** (SB-H01). Play App Signing + Play account transfer remain separate (**OPEN** / SB-H02).  
**WHY:** `CREDENTIAL_ESCROW_STATUS.md`; `EVIDENCE/05-ANDROID/ANDROID_SIGNING_INVENTORY.md`.  
**OWNER ACTION:** iOS escrow (SB-I01); Play enrollment screenshot (SB-H02).  
**BUYER ACTION:** `bundleRelease` from Android escrow + Xcode archive after iOS materials.  
**EVIDENCE REQUIRED:** Buyer-signed artifacts.  
**ACCEPTANCE TEST:** Submit RC without Ankur logins.

### Subscriptions
**FAILURE:** RC org UNKNOWN; webhook secret on Coolify.  
**WHY:** `BILLING_HANDOVER.md`.  
**OWNER ACTION:** Invite RC admin; rotate keys after.  
**BUYER ACTION:** Test webhook.  
**EVIDENCE REQUIRED:** 2xx + DB row.  
**ACCEPTANCE TEST:** Buyer edits offering.

### Analytics
**FAILURE:** FA/GA4 property owners UNKNOWN.  
**WHY:** Secret names only.  
**OWNER ACTION:** Transfer properties or give IDs.  
**BUYER ACTION:** Confirm hits.  
**EVIDENCE REQUIRED:** Buyer console screenshot.  
**ACCEPTANCE TEST:** Event visible in buyer GA4/Firebase.

### Ads
**FAILURE:** Ads login is founder Gmail; campaign still ENABLED historically.  
**WHY:** `ANALYTICS_ADS_HANDOVER.md`. **Do not change campaign this pass.**  
**OWNER ACTION:** MCC / account transfer.  
**BUYER ACTION:** Accept admin.  
**EVIDENCE REQUIRED:** Buyer is admin.  
**ACCEPTANCE TEST:** Buyer can view campaign `23986249354` without `ankur6779@gmail.com`.

### AI APIs
**FAILURE:** OpenAI/Gemini/etc. keys on founder secret stores.  
**WHY:** `EXTERNAL_SERVICE_HANDOVER.md`.  
**OWNER ACTION:** Revoke after buyer keys live.  
**BUYER ACTION:** New orgs/TOS.  
**EVIDENCE REQUIRED:** Prod call on buyer key; founder key 401.  
**ACCEPTANCE TEST:** One TTS or LLM success.

### Monitoring
**FAILURE:** Sentry live use UNKNOWN; logs on UNKNOWN host.  
**WHY:** Empty DSN example.  
**OWNER ACTION:** Disclose DSN or confirm unset.  
**BUYER ACTION:** New project or accept none.  
**EVIDENCE REQUIRED:** Written confirm.  
**ACCEPTANCE TEST:** Test error **or** documented “Sentry off.”

### Support
**FAILURE:** Public address not proven on buyer MX.  
**WHY:** Same as email.  
**OWNER ACTION:** Mailbox transfer.  
**BUYER ACTION:** Staff inbox.  
**EVIDENCE REQUIRED:** Thread received.  
**ACCEPTANCE TEST:** User email reaches buyer.

### Backups
**FAILURE:** No 24 Sep backup/restore certification.  
**WHY:** `BACKUP_RESTORE_CERTIFICATION.md` FAIL.  
**OWNER ACTION:** Encrypted dump + GCS inventory.  
**BUYER ACTION:** Scratch restore.  
**EVIDENCE REQUIRED:** Restore log.  
**ACCEPTANCE TEST:** Same as database test.

### Patent prosecution
**FAILURE:** Applicant is Ankur Raman; no assignment; INCLUDED/EXCLUDED unchecked.  
**WHY:** `PATENT_TRANSACTION_SCOPE.md`.  
**OWNER ACTION:** Check INCLUDED or EXCLUDED; if included, IPO assignment.  
**BUYER ACTION:** Counsel.  
**EVIDENCE REQUIRED:** Signed election ± IPO receipt.  
**ACCEPTANCE TEST:** Schedule matches election.

---

Open-Meteo weather detect would still function (no founder account). That does not make the product operable.
