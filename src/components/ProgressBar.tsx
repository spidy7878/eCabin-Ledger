import React from "react";
import { View, Text } from "react-native";
import { colors } from "../constants/colors";
import { spacing } from "../constants/spacing";

type ProgressBarProps = {
	label?: string;
	percent: number;
};

export default function ProgressBar({ label, percent }: ProgressBarProps) {
	const safe = Math.max(0, Math.min(100, percent));
	return (
		<View style={{ marginVertical: spacing.sm }}>
			{label ? (
				<Text style={{ color: colors.text, marginBottom: 6 }}>{label}</Text>
			) : null}
			<View
				style={{
					height: 10,
					backgroundColor: colors.secondary,
					borderRadius: 8,
					overflow: "hidden",
				}}
			>
				<View
					style={{
						height: 10,
						width: `${safe}%`,
						backgroundColor: colors.primary,
					}}
				/>
			</View>
		</View>
	);
}
