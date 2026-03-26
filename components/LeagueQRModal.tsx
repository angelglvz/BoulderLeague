/**
 * LeagueQRModal.tsx
 * Modal de pantalla completa con código QR de la liguilla.
 *
 * El QR codifica el deep link:
 *   climbify://join?league=<id>              (pública)
 *   climbify://join?league=<id>&code=<code>  (privada)
 *
 * Incluye botón "Compartir enlace" que usa la API nativa Share
 * (iOS / Android) o copia al portapapeles en web.
 */

import { View, Text, Modal, TouchableOpacity, StyleSheet, Share, Platform, Clipboard } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import QRCode from 'react-native-qrcode-svg'
import { typography, spacing, radius } from '../constants'
import { Icon } from './Icon'

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  visible:    boolean
  onClose:    () => void
  leagueName: string
  leagueId:   string
  accessCode?: string | null
  isPrivate:  boolean
}

// ── Helper ────────────────────────────────────────────────────────────────────

function buildDeepLink(leagueId: string, accessCode?: string | null, isPrivate?: boolean): string {
  const base = `climbify://join?league=${leagueId}`
  return isPrivate && accessCode ? `${base}&code=${accessCode}` : base
}

// ── Componente ────────────────────────────────────────────────────────────────

export function LeagueQRModal({ visible, onClose, leagueName, leagueId, accessCode, isPrivate }: Props) {
  const deepLink = buildDeepLink(leagueId, accessCode, isPrivate)

  async function handleShare() {
    const message = `Únete a la liguilla "${leagueName}": ${deepLink}`
    try {
      if (Platform.OS === 'web') {
        // En web: navigator.share si disponible, si no → portapapeles
        if (typeof navigator !== 'undefined' && (navigator as any).share) {
          await (navigator as any).share({ title: leagueName, text: message, url: deepLink })
        } else {
          Clipboard.setString(deepLink)
        }
      } else {
        await Share.share({ message, url: deepLink })
      }
    } catch {
      // Usuario canceló la acción nativa → sin feedback extra
    }
  }

  async function handleCopyLink() {
    Clipboard.setString(deepLink)
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={styles.overlay}>

        {/* Botón cerrar */}
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.8}>
          <Icon name="close-outline" size={28} color="#fff" />
        </TouchableOpacity>

        {/* Contenido central */}
        <View style={styles.content}>

          {/* Nombre de la liguilla */}
          <Text style={styles.leagueName} numberOfLines={2}>{leagueName}</Text>

          {/* Código QR */}
          <View style={styles.qrWrapper}>
            <QRCode
              value={deepLink}
              size={240}
              backgroundColor="#ffffff"
              color="#000000"
            />
          </View>

          {/* Código de acceso (solo liguillas privadas) */}
          {isPrivate && accessCode ? (
            <View style={styles.codeRow}>
              <Icon name="lock-closed-outline" size={14} color="rgba(255,255,255,0.55)" />
              <Text style={styles.codeLabel}>Código: </Text>
              <Text style={styles.codeValue}>{accessCode}</Text>
            </View>
          ) : null}

          <Text style={styles.hint}>Escanea con la cámara para unirte</Text>

          {/* Acciones */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleShare} activeOpacity={0.8}>
              <Icon name="share-outline" size={20} color="#000" />
              <Text style={styles.actionBtnText}>Compartir</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={handleCopyLink} activeOpacity={0.8}>
              <Icon name="copy-outline" size={20} color="rgba(255,255,255,0.85)" />
              <Text style={[styles.actionBtnText, styles.actionBtnTextSecondary]}>Copiar enlace</Text>
            </TouchableOpacity>
          </View>

        </View>
      </SafeAreaView>
    </Modal>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.93)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.lg,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    width: '100%',
    maxWidth: 360,
  },
  leagueName: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: '#fff',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  qrWrapper: {
    padding: spacing.lg,
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    shadowColor: '#fff',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  codeLabel: {
    fontSize: typography.size.sm,
    color: 'rgba(255,255,255,0.55)',
  },
  codeValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: '#fff',
    letterSpacing: 2,
  },
  hint: {
    fontSize: typography.size.sm,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: '#fff',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  actionBtnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  actionBtnText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: '#000',
  },
  actionBtnTextSecondary: {
    color: 'rgba(255,255,255,0.85)',
  },
})



