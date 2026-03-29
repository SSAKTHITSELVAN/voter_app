import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/theme';

interface ImagePreviewModalProps {
  visible: boolean;
  imageUri: string | null;
  title?: string;
  onClose: () => void;
}

export function ImagePreviewModal({
  visible,
  imageUri,
  title = 'Landmark Preview',
  onClose,
}: ImagePreviewModalProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.imageWrap}>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.image}
                contentFit="contain"
                transition={180}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="image-outline" size={28} color={Colors.textMuted} />
                <Text style={styles.emptyText}>Image unavailable</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    padding: Spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.white20,
    backgroundColor: Colors.bgCard,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.bgCardRaised,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgOverlay,
  },
  imageWrap: {
    height: 420,
    backgroundColor: Colors.bgDark,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.bgDark,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
  },
});
