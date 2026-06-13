import { generateMDMUUID } from '../utils/uuid.js'
import {
  iOSRestrictions,
  macOSRestrictions,
  DOHConfig,
} from '../types/device.types.js'

// ─── Plist builder helpers ────────────────────────────────

function plistBool(value: boolean): string {
  return value ? '<true/>' : '<false/>'
}

function plistString(value: string): string {
  return `<string>${value}</string>`
}

function plistKey(key: string, value: string): string {
  return `<key>${key}</key>\n\t\t\t${value}`
}

// ─── iOS .mobileconfig generator ─────────────────────────

export function generateiOSConfig(
  accountId: string,
  deviceId: string,
  restrictions: iOSRestrictions,
  doh?: DOHConfig
): Buffer {
  const profileUUID = generateMDMUUID()
  const restrictionUUID = generateMDMUUID()
  const dnsUUID = generateMDMUUID()

  // Build the restriction payload
  const restrictionPayload = `
    <dict>
      <key>PayloadType</key>
      <string>com.apple.applicationaccess</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
      <key>PayloadIdentifier</key>
      <string>com.Noori.restrictions.${accountId}</string>
      <key>PayloadUUID</key>
      <string>${restrictionUUID}</string>
      <key>PayloadDisplayName</key>
      <string>Noori Content Restrictions</string>

      ${plistKey('allowAssistant', plistBool(restrictions.allowAssistant))}
      ${plistKey('allowAssistantWhileLocked', plistBool(restrictions.allowAssistantWhileLocked))}
      ${plistKey('allowCamera', plistBool(restrictions.allowCamera))}
      ${plistKey('allowScreenShot', plistBool(restrictions.allowScreenShot))}
      ${plistKey('allowAirPrint', plistBool(restrictions.allowAirPrint))}
      ${plistKey('allowSafari', plistBool(restrictions.allowSafari))}
      ${plistKey('forceAssistantProfanityFilter', plistBool(restrictions.forceAssistantProfanityFilter))}
      ${plistKey('allowAppInstallation', plistBool(restrictions.allowAppInstallation))}
      ${plistKey('allowInAppPurchases', plistBool(restrictions.allowInAppPurchases))}
      ${plistKey('forceITunesStorePasswordEntry', plistBool(restrictions.requireITunesStorePasswordEntry))}
      ${plistKey('ratingMovies', plistString(restrictions.ratingMovies))}
      ${plistKey('ratingTVShows', plistString(restrictions.ratingTVShows))}
      ${plistKey('ratingApps', plistString(restrictions.ratingApps))}
      ${plistKey('allowEraseContentAndSettings', plistBool(restrictions.allowEraseContentAndSettings))}
      ${plistKey('allowPasscodeModification', plistBool(restrictions.allowPasscodeModification))}
      ${plistKey('allowAccountModification', plistBool(restrictions.allowAccountModification))}
      ${plistKey('allowBluetoothModification', plistBool(restrictions.allowBluetoothModification))}
      ${plistKey('allowUSBRestrictedMode', plistBool(restrictions.allowUSBRestrictedMode))}
      ${plistKey('allowPasswordAutoFill', plistBool(restrictions.allowPasswordAutoFill))}
      ${plistKey('allowVPNCreation', plistBool(restrictions.allowVPNCreation))}
      ${plistKey('allowWifiPowerModification', plistBool(restrictions.allowWifiPowerModification))}
    </dict>`

  // Build DNS over HTTPS payload (if Cloudflare DoH URL is provided)
  const dnsPayload = doh
    ? `
    <dict>
      <key>PayloadType</key>
      <string>com.apple.dnsSettings.managed</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
      <key>PayloadIdentifier</key>
      <string>com.Noori.dns.${accountId}</string>
      <key>PayloadUUID</key>
      <string>${dnsUUID}</string>
      <key>PayloadDisplayName</key>
      <string>Noori DNS Filter</string>
      <key>DNSProtocol</key>
      <string>HTTPS</string>
      <key>ServerURL</key>
      <string>${doh.serverURL}</string>
      <key>ServerName</key>
      <string>${doh.serverName}</string>
      <key>OnDemandRules</key>
      <array>
        <dict>
          <key>Action</key>
          <string>Connect</string>
        </dict>
      </array>
    </dict>`
    : ''

  const payloadContent = [restrictionPayload, dnsPayload]
    .filter(Boolean)
    .join('\n')

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
  <key>PayloadIdentifier</key>
  <string>com.Noori.profile.${accountId}.${deviceId}</string>
  <key>PayloadUUID</key>
  <string>${profileUUID}</string>
  <key>PayloadDisplayName</key>
  <string>Noori Content Filter</string>
  <key>PayloadDescription</key>
  <string>Managed content filtering profile by Noori</string>
  <key>PayloadOrganization</key>
  <string>Noori</string>
  <key>PayloadRemovalDisallowed</key>
  ${plistBool(!restrictions.allowEraseContentAndSettings)}
  <key>PayloadContent</key>
  <array>
    ${payloadContent}
  </array>
</dict>
</plist>`

  return Buffer.from(plist.trim(), 'utf-8')
}

// ─── macOS .mobileconfig generator ───────────────────────

export function generatemacOSConfig(
  accountId: string,
  deviceId: string,
  restrictions: macOSRestrictions,
  doh?: DOHConfig
): Buffer {
  const profileUUID = generateMDMUUID()
  const restrictionUUID = generateMDMUUID()
  const dnsUUID = generateMDMUUID()

  const restrictionPayload = `
    <dict>
      <key>PayloadType</key>
      <string>com.apple.applicationaccess</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
      <key>PayloadIdentifier</key>
      <string>com.Noori.restrictions.macos.${accountId}</string>
      <key>PayloadUUID</key>
      <string>${restrictionUUID}</string>
      <key>PayloadDisplayName</key>
      <string>Noori macOS Restrictions</string>

      ${plistKey('allowCamera', plistBool(restrictions.allowCamera))}
      ${plistKey('allowScreenShot', plistBool(restrictions.allowScreenShot))}
      ${plistKey('allowAirPrint', plistBool(restrictions.allowAirPrint))}
      ${plistKey('allowAssistant', plistBool(restrictions.allowAssistant))}
      ${plistKey('allowEraseContentAndSettings', plistBool(restrictions.allowEraseContentAndSettings))}
      ${plistKey('allowPasscodeModification', plistBool(restrictions.allowPasscodeModification))}
      ${plistKey('allowAccountModification', plistBool(restrictions.allowAccountModification))}
      ${plistKey('allowBluetoothModification', plistBool(restrictions.allowBluetoothModification))}
      ${plistKey('allowAppInstallation', plistBool(restrictions.allowAppInstallation))}
      ${plistKey('allowInAppPurchases', plistBool(restrictions.allowInAppPurchases))}
    </dict>`

  // Safari preferences via com.apple.Safari managed preferences
  const safariPayload = `
    <dict>
      <key>PayloadType</key>
      <string>com.apple.ManagedClient.preferences</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
      <key>PayloadIdentifier</key>
      <string>com.Noori.safari.${accountId}</string>
      <key>PayloadUUID</key>
      <string>${generateMDMUUID()}</string>
      <key>PayloadDisplayName</key>
      <string>Noori Safari Preferences</string>
      <key>PayloadContent</key>
      <dict>
        <key>com.apple.Safari</key>
        <dict>
          <key>Forced</key>
          <array>
            <dict>
              <key>mcx_preference_settings</key>
              <dict>
                <key>JavaScriptEnabled</key>
                ${plistBool(restrictions.safariAllowJavaScript)}
                <key>AutoFillPasswords</key>
                ${plistBool(restrictions.safariAllowAutoFill)}
              </dict>
            </dict>
          </array>
        </dict>
      </dict>
    </dict>`

  const dnsPayload = doh
    ? `
    <dict>
      <key>PayloadType</key>
      <string>com.apple.dnsSettings.managed</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
      <key>PayloadIdentifier</key>
      <string>com.Noori.dns.macos.${accountId}</string>
      <key>PayloadUUID</key>
      <string>${dnsUUID}</string>
      <key>PayloadDisplayName</key>
      <string>Noori DNS Filter</string>
      <key>DNSProtocol</key>
      <string>HTTPS</string>
      <key>ServerURL</key>
      <string>${doh.serverURL}</string>
      <key>ServerName</key>
      <string>${doh.serverName}</string>
    </dict>`
    : ''

  const payloadContent = [restrictionPayload, safariPayload, dnsPayload]
    .filter(Boolean)
    .join('\n')

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
  <key>PayloadIdentifier</key>
  <string>com.Noori.macos.${accountId}.${deviceId}</string>
  <key>PayloadUUID</key>
  <string>${profileUUID}</string>
  <key>PayloadDisplayName</key>
  <string>Noori macOS Content Filter</string>
  <key>PayloadDescription</key>
  <string>Managed content filtering profile for macOS by Noori</string>
  <key>PayloadOrganization</key>
  <string>Noori</string>
  <key>PayloadRemovalDisallowed</key>
  ${plistBool(!restrictions.allowEraseContentAndSettings)}
  <key>PayloadContent</key>
  <array>
    ${payloadContent}
  </array>
</dict>
</plist>`

  return Buffer.from(plist.trim(), 'utf-8')
}
