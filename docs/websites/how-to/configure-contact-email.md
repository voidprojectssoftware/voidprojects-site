> **AI-generated, not yet reviewed.** This document was written by an AI assistant and has not been reviewed by a human.

# Configure contact form email

The `/websites` contact form posts to `/api/contact`. When three app settings are present on the Static Web App, the function emails each submission to the team inbox through Azure Communication Services (ACS). When any of them is missing, it logs submissions instead (exactly as before) and writes one warning per function instance naming the missing settings.

## The settings

| App setting             | Value                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `ACS_CONNECTION_STRING` | The Communication Services resource's connection string (a secret: never commit it or paste it in a PR)      |
| `CONTACT_FROM`          | The sender, on the verified ACS domain, for example `noreply@voidprojects.ai`                                |
| `CONTACT_TO`            | The inbox that receives submissions, for example `hello@voidprojects.ai`. It must exist before you set this. |

Each email is plain text, with the subject `Website request from {name} ({kind})` and Reply-To set to the visitor's address, so replying from the inbox answers the visitor.

The function uses the connection string rather than a managed identity: Static Web Apps managed functions do not support managed identities.

## Set them with Terraform (normal path)

The settings are owned by `voidprojects-site-infra` (`terraform/site`), which creates the ACS resources and writes these app settings once the domain is verified. Follow its README section "Contact email (ACS)". Settings set by hand are overwritten by the next Terraform apply.

## Set them by hand (one-off testing only)

```sh
az staticwebapp appsettings set \
  --name swa-voidprojects-site \
  --resource-group rg-voidprojects-site \
  --setting-names \
    "ACS_CONNECTION_STRING=$(az communication list-key --name acs-voidprojects-site --resource-group rg-voidprojects-site --query primaryConnectionString -o tsv)" \
    CONTACT_FROM=noreply@voidprojects.ai \
    CONTACT_TO=hello@voidprojects.ai
```

Remove them with `az staticwebapp appsettings delete --name swa-voidprojects-site --setting-names ACS_CONNECTION_STRING CONTACT_FROM CONTACT_TO`.

## Check it works

1. Submit the form on `https://voidprojects.ai/websites`.
2. The email arrives in `CONTACT_TO`. If it does not, the form shows its error and mailto fallback, and the function log (Application Insights, or the Static Web App's Functions logs) has a `[contact] email delivery failed: ...` line with the reason. A `[contact] ... not set; submissions are only logged` warning means a setting is missing.

`npm run dev` never sends email: the dev middleware always logs submissions to the terminal.
