// ─── iOS Restrictions ─────────────────────────────────────

export interface iOSRestrictions {
  // Siri
  allowAssistant: boolean
  allowAssistantWhileLocked: boolean

  // Camera & Media
  allowCamera: boolean
  allowScreenShot: boolean
  allowAirPrint: boolean

  // Browser & Search
  allowSafari: boolean
  forceAssistantProfanityFilter: boolean // Safe Search

  // App Management
  allowAppInstallation: boolean
  allowInAppPurchases: boolean
  requireITunesStorePasswordEntry: boolean

  // Content Ratings
  ratingMovies: '1000' | '500' | '200' | '150' | '100' | '0' // 1000 = all, 0 = none
  ratingTVShows: '1000' | '500' | '400' | '300' | '200' | '100' | '0'
  ratingApps: '1000' | '600' | '300' | '200' | '9' | '0'

  // Security
  allowEraseContentAndSettings: boolean
  allowPasscodeModification: boolean
  allowAccountModification: boolean
  allowBluetoothModification: boolean
  allowUSBRestrictedMode: boolean
  allowPasswordAutoFill: boolean

  // Network
  allowVPNCreation: boolean
  allowWifiPowerModification: boolean
}

// ─── macOS Restrictions ───────────────────────────────────

export interface macOSRestrictions {
  // Safari
  allowSafari: boolean
  safariAllowJavaScript: boolean
  safariAllowAutoFill: boolean

  // System
  allowCamera: boolean
  allowScreenShot: boolean
  allowAirPrint: boolean
  allowAssistant: boolean

  // Security
  allowEraseContentAndSettings: boolean
  allowPasscodeModification: boolean
  allowAccountModification: boolean
  allowBluetoothModification: boolean
  requireAdminForSystemPrefs: boolean

  // App Management
  allowAppInstallation: boolean
  allowInAppPurchases: boolean
}

// ─── DNS over HTTPS config ────────────────────────────────

export interface DOHConfig {
  serverURL: string     // Cloudflare DoH endpoint for this account
  serverName: string    // SNI hostname
}

// ─── Default values ───────────────────────────────────────

export const defaultiOSRestrictions: iOSRestrictions = {
  allowAssistant: true,
  allowAssistantWhileLocked: false,
  allowCamera: true,
  allowScreenShot: true,
  allowAirPrint: true,
  allowSafari: true,
  forceAssistantProfanityFilter: true,
  allowAppInstallation: true,
  allowInAppPurchases: false,
  requireITunesStorePasswordEntry: true,
  ratingMovies: '200',
  ratingTVShows: '300',
  ratingApps: '600',
  allowEraseContentAndSettings: false,
  allowPasscodeModification: false,
  allowAccountModification: false,
  allowBluetoothModification: true,
  allowUSBRestrictedMode: true,
  allowPasswordAutoFill: true,
  allowVPNCreation: false,
  allowWifiPowerModification: true,
}

export const defaultmacOSRestrictions: macOSRestrictions = {
  allowSafari: true,
  safariAllowJavaScript: true,
  safariAllowAutoFill: false,
  allowCamera: true,
  allowScreenShot: true,
  allowAirPrint: true,
  allowAssistant: true,
  allowEraseContentAndSettings: false,
  allowPasscodeModification: false,
  allowAccountModification: false,
  allowBluetoothModification: true,
  requireAdminForSystemPrefs: true,
  allowAppInstallation: true,
  allowInAppPurchases: false,
}
