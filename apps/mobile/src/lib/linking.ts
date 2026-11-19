import { Alert, Linking } from 'react-native';

export async function openUrl(url: string, failMessage = 'این کار روی این دستگاه ممکن نیست') {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('خطا', failMessage);
  }
}
