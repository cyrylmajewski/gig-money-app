import { useRef, useState } from "react";
import { useRouter, Stack as ExpoStack } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import {
	Keyboard,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	TextInput } from "react-native";
import { YStack, XStack, Text, Button, Paragraph } from "tamagui";


export default function NewIncomeScreen() {
	const { t } = useTranslation();
	const router = useRouter();
	const inputRef = useRef<TextInput>(null);

	const [amount, setAmount] = useState("");
	const [source, setSource] = useState("");
	const [amountError, setAmountError] = useState(false);

	function handleAmountChange(raw: string) {
		const cleaned = raw.replace(",", ".").replace(/[^0-9.]/g, "");
		const parts = cleaned.split(".");
		let value = parts[0]!.slice(0, 7);
		if (parts.length > 1) {
			value += "." + parts[1]!.slice(0, 2);
		}
		setAmount(value);
		setAmountError(false);
	}

	const displayAmount = amount ? amount.replace(".", ",") : "";

	function handleContinue() {
		Keyboard.dismiss();
		const parsed = parseFloat(amount);
		if (!amount || isNaN(parsed) || parsed <= 0) {
			setAmountError(true);
			return;
		}
		router.push({
			pathname: "/income/allocate",
			params: {
				amount: parsed.toString(),
				source: source.trim() } });
	}

	return (
		<>
			<ExpoStack.Screen
				options={{
					title: t("income.new.title"),
					headerLeft: () => (
						<Pressable
							onPress={() => router.back()}
							hitSlop={8}
							style={{ paddingHorizontal: 8, paddingVertical: 4 }}
						>
							<Text>{t("common.cancel")}</Text>
						</Pressable>
					) }}
			/>

			<SafeAreaView
				style={{ flex: 1 }}
				edges={["bottom"]}
			>
				<KeyboardAvoidingView
					style={{ flex: 1 }}
					behavior={Platform.OS === "ios" ? "padding" : "height"}
					keyboardVerticalOffset={100}
				>
					<YStack flex={1} px="$5" pt="$4" pb="$5">
						{/* Subtitle */}
						<Paragraph style={{ textAlign: "center" }}>
							{t("income.new.subtitle")}
						</Paragraph>

						{/* Hero amount */}
						<Pressable
							style={{
								flex: 1,
								justifyContent: "center",
								alignItems: "center" }}
							onPress={() => {
								if (inputRef.current?.isFocused()) {
									Keyboard.dismiss();
								} else {
									inputRef.current?.focus();
								}
							}}
						>
							<XStack items="baseline" justify="center" gap="$3">
								<Text letterSpacing={-1}>
									{displayAmount || "0"}
								</Text>
								<Text>{t("common.currency")}</Text>
							</XStack>

							{amountError && (
								<Paragraph mt="$2">
									{t("income.new.amountError")}
								</Paragraph>
							)}
						</Pressable>

						{/* Hidden native input */}
						<TextInput
							ref={inputRef}
							style={{ position: "absolute", opacity: 0, height: 0 }}
							keyboardType="decimal-pad"
							value={amount}
							onChangeText={handleAmountChange}
							autoFocus
							accessibilityLabel={t("income.new.amount")}
						/>

						{/* Source field */}
						<YStack gap="$2" mb="$4">
							<Text
								textTransform="uppercase"
								letterSpacing={0.5}
							>
								{t("income.new.source").toUpperCase()}
							</Text>
							<XStack
								borderWidth={1}
								rounded="$4"
								items="center"
								px="$4"
								height={52}
							>
								<TextInput
									style={{ flex: 1, paddingVertical: 8 }}
									placeholder={t("income.new.sourcePlaceholder")}
									value={source}
									onChangeText={setSource}
									returnKeyType="done"
									accessibilityLabel={t("income.new.source")}
								/>
							</XStack>
						</YStack>

						<Button
							size="$5"
							onPress={handleContinue}
							disabled={!amount}
							accessibilityRole="button"
						>
							<Text>
								{t("income.new.cta")}
							</Text>
						</Button>
					</YStack>
				</KeyboardAvoidingView>
			</SafeAreaView>
		</>
	);
}
