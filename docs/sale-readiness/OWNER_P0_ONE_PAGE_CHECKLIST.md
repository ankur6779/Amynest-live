# OWNER P0 ONE-PAGE CHECKLIST

Work top to bottom. Check only when the **evidence file exists**.

## Phase 0 — decide

- [x] Path A selected (AmyWorld sole prop)
    Evidence: owner confirmation 25 Sep — `IP/OWNER_CONFIRMED_ASSET_STRUCTURE.md`
    Where to save: signed structure later → `EVIDENCE/01-LEGAL/`
    Dependency: none
    Done when: **SIGNED / FINAL TRANSACTION STRUCTURE** exists (election alone is not SB-C01 CLOSED)

- [x] Patent transaction scope decided — INCLUDE
    Evidence: `IP/PATENT_OWNER_DECISION.md`
    Where to save: that file
    Dependency: none
    Done when: scope locked (this is **not** “patent transferred”)

- [ ] Execute patent assignment/transfer
    Evidence: signed instrument Ankur Raman → named buyer
    Where to save: `EVIDENCE/01-LEGAL/`
    Dependency: buyer/transferee identified; counsel
    Done when: executed assignment exists

- [ ] Complete applicable IPO recordal/prosecution steps
    Evidence: IPO receipt / recordal
    Where to save: `EVIDENCE/01-LEGAL/`
    Dependency: assignment executed
    Done when: recordal verified

- [ ] Preserve evidence and verify buyer receives intended patent rights
    Evidence: schedule + receipts
    Where to save: `EVIDENCE/01-LEGAL/`
    Dependency: assignment + recordal
    Done when: buyer confirmed — **not** done today

- [ ] Collect source-title pack (no invented agreements)
    Evidence: founder statement + git/contributor export + “agreements exist / none”
    Where to save: `EVIDENCE/01-LEGAL/`
    Dependency: none
    Done when: pack complete; counsel memo still required to close SB-A01

## Phase 2 — escrow (offline; nothing in Git except IDs)

- [ ] Encrypt production secrets archive
    Evidence: escrow ID + SHA-256 of **ciphertext**
    Where to save: ID → `EVIDENCE/03-ESCROW/`; archive **outside Git**
    Dependency: none
    Done when: `escrow-identifier.md` exists and you can decrypt offline

- [ ] Encrypt Android keystore
    Evidence: SHA-256 + alias name (no password)
    Where to save: `EVIDENCE/05-ANDROID/`; keystore **outside Git**
    Dependency: none
    Done when: checksum file exists

- [ ] Encrypt iOS certs / profiles / APNs (or write “no APNs file”)
    Evidence: SHA-256
    Where to save: `EVIDENCE/06-IOS/`; materials **outside Git**
    Dependency: none
    Done when: checksum file exists

- [ ] Write production DB **hostname only**
    Evidence: hostname + redacted screenshot
    Where to save: `EVIDENCE/04-DATABASE/`
    Dependency: none
    Done when: hostname on file (closes SB-G01)

- [ ] Encrypted dump + scratch restore
    Evidence: SHA-256 + restore log (schema + R/W)
    Where to save: checksum/log → `EVIDENCE/04-DATABASE/`; dump **outside Git**
    Dependency: hostname
    Done when: restore log shows R/W pass (closes SB-G02)

## Phase 3 — screenshots only (no transfers, no DNS)

- [ ] GitHub: Settings → Collaborators
    Evidence: screenshot (only `ankur6779`)
    Where to save: `EVIDENCE/02-OWNERSHIP/`
    Dependency: none
    Done when: screenshot saved (SB-B01 still BLOCKED until buyer)

- [ ] Coolify + Hetzner + Cloudflare + GCP + Firebase login + project/zone
    Evidence: screenshots; no tokens
    Where to save: `EVIDENCE/08-CLOUD/`
    Dependency: none
    Done when: five providers named (owner half of SB-F01)

- [ ] Coolify git method (App / webhook / poll)
    Evidence: settings screenshot
    Where to save: `EVIDENCE/12-DEPLOY/`
    Dependency: none
    Done when: method named (SB-F02 still BLOCKED)

- [ ] Domain registrar: account, registrant, renewal, lock, NS (no auth-code)
    Evidence: screenshots
    Where to save: `EVIDENCE/07-DOMAIN/`
    Dependency: none
    Done when: registrar + registrant named (owner half of SB-J01)

- [ ] Play: legal name, account ID, `com.amynest.app`, App Signing, eligibility if shown
    Evidence: screenshots
    Where to save: `EVIDENCE/09-PLAY/`
    Dependency: compare name to Path A/B
    Done when: eligibility captured or “screen not shown” noted

- [ ] Apple: entity, Team ID, Account Holder, `6767664343`, eligibility if shown
    Evidence: screenshots
    Where to save: `EVIDENCE/10-APPLE/`
    Dependency: compare to Path A/B
    Done when: eligibility captured or “screen not shown” noted

- [ ] RevenueCat: org/project page (no API keys)
    Evidence: screenshot
    Where to save: `EVIDENCE/11-REVENUECAT/`
    Dependency: none
    Done when: org named (invite later)

## Do not do yet

Deploy · rotate secrets · change DNS · Ads · Play/Apple/RC transfer · patent filing · sign SPA without counsel · put secrets in Git.

## Phase 4 — needs a buyer

Buyer orgs · vendor transfers · buyer deploy · buyer AAB/IPA · RC webhook on buyer API · founder-exit PASS.
