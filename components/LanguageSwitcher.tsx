import React from 'react';
import { View, Button } from 'react-native';
import i18n from '../lib/i18n';

export default function LanguageSwitcher() {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', margin: 10 }}>
      <Button title="English" onPress={() => i18n.changeLanguage('en')} />
      <Button title="தமிழ்" onPress={() => i18n.changeLanguage('ta')} />
    </View>
  );
}
