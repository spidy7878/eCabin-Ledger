import React, { ReactNode } from "react";
import { View, TextInput, Text } from "react-native";
import { colors } from "../constants/colors";
import { spacing } from "../constants/spacing";

type InputProps = {
	label?: string;
	placeholder?: string;
	secure?: boolean;
	value?: string;
	onChangeText?: (t: string) => void;
	style?: any;
	leftIcon?: ReactNode;
	rightIcon?: ReactNode;
};

export default function Input({
	label,
	placeholder,
	secure,
	value,
	onChangeText,
	style,
	leftIcon,
	rightIcon,
}: InputProps) {
	return (
		<View style={{ marginVertical: spacing.sm }}>
			{label ? (
				<Text style={{ color: colors.text, marginBottom: 6 }}>{label}</Text>
			) : null}

			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					backgroundColor: "white",
					paddingHorizontal: 12,
					paddingVertical: 8,
					borderRadius: 10,
					borderWidth: 1,
					borderColor: colors.border,
				}}
			>
				{leftIcon ? <View style={{ marginRight: 8 }}>{leftIcon}</View> : null}
				<TextInput
					value={value}
					onChangeText={onChangeText}
					placeholder={placeholder}
					secureTextEntry={secure}
					placeholderTextColor="#9CA3AF"
					style={[{ flex: 1, color: colors.text, padding: 0 }, style]}
				/>
				{rightIcon ? <View style={{ marginLeft: 8 }}>{rightIcon}</View> : null}
			</View>
		</View>
	);
}
