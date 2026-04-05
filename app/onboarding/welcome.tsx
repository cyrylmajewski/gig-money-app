import { YStack, Text } from 'tamagui';

export default function WelcomeScreen() {
  return (
    <YStack flex={1} justifyContent="center" alignItems="center">
      <Text fontSize="$6">Welcome</Text>
    </YStack>
  );
}
