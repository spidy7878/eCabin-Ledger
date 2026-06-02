import React, { ReactNode } from "react";
import { View, TextInput, Text, TextInputProps } from "react-native";
import { colors } from "../constants/colors";
import { spacing } from "../constants/spacing";

type InputProps = TextInputProps & {
	label?: string;
	leftIcon?: ReactNode;
	rightIcon?: ReactNode;
};

export default function Input({
	label,
	leftIcon,
	rightIcon,
	style,
	...textInputProps
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
					placeholderTextColor="#9CA3AF"
					style={[{ flex: 1, color: colors.text, padding: 0 }, style]}
					{...textInputProps}
				/>
				{rightIcon ? <View style={{ marginLeft: 8 }}>{rightIcon}</View> : null}
			</View>
		</View>
	);
}
