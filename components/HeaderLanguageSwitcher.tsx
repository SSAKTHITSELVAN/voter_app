import React, { useState } from 'react';
import { View, TouchableOpacity, Modal, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../lib/i18n';
import { Colors } from '@/constants/theme';

export default function HeaderLanguageSwitcher() {
  const [modalVisible, setModalVisible] = useState(false);
  return (
    <View>
      <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.iconBtn}>
        <Ionicons name="language" size={22} color={Colors.white} />
      </TouchableOpacity>
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity style={styles.overlay} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <TouchableOpacity onPress={() => { i18n.changeLanguage('en'); setModalVisible(false); }} style={styles.langBtn}>
              <Text style={styles.langText}>English</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { i18n.changeLanguage('ta'); setModalVisible(false); }} style={styles.langBtn}>
              <Text style={styles.langText}>தமிழ்</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    elevation: 8,
  },
  langBtn: {
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: Colors.primary,
  },
  langText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
