import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Page not found</Text>
      <Pressable onPress={() => router.replace('/')} style={styles.link}>
        <Text style={styles.linkText}>Go home</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  title: { color: Colors.text, fontSize: 20, fontWeight: '600', marginBottom: 16 },
  link: { padding: 12 },
  linkText: { color: Colors.primary, fontSize: 15 },
});
