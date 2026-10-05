# Finish the hosted verification

The code and local tests are available. These steps must be performed on the deployed project before claiming the full assignment is complete.

- [ ] Supabase project created; migration applied; Edge Function deployed.
- [ ] Custom SMTP configured; owner receives a real code, wrong/expired codes fail, returning sign-in succeeds.
- [ ] New GitHub repository has published both app and report; original Guide-8- is still untouched.
- [ ] Laptop creates calendar; phone opens guest link and reads it.
- [ ] Phone edits a movie before the deadline; laptop refresh shows it.
- [ ] Owner locks sharing; phone cannot edit even by sending a direct request.
- [ ] New link revokes old guest link.
- [ ] Disposable test calendar deleted by owner; guest deletion is rejected.
- [ ] Restart/redeploy API; saved database records remain accessible. Record the exact action, not just browser refresh.
- [ ] Use Network tab to capture one redacted real hosted request and match X-Request-Id to function logs.
- [ ] Check built JavaScript and Git history for actual secrets; never publish tokens in screenshots.
- [ ] Check production permissions by trying direct Data API/table/function access using a public key.
- [ ] Use automated tests for the date boundary; do not weaken the public server's clock checks for a demo.
- [ ] Peer reviews the agreed classroom test calendar; record what confused them and any fix.
- [ ] Update report with actual live URLs, real evidence and remaining limitations.

Never change a real shared calendar for destructive testing; create a clearly disposable one first.
