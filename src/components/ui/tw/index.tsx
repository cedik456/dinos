import React from "react";
import { useCssElement } from "react-native-css";
import {
  Pressable as NativePressable,
  ScrollView as NativeScrollView,
  Text as NativeText,
  TextInput as NativeTextInput,
  View as NativeView,
} from "react-native";

export type ViewProps = React.ComponentProps<typeof NativeView> & {
  className?: string;
};

export function View(props: ViewProps) {
  return useCssElement(NativeView, props, { className: "style" });
}

export function Text(
  props: React.ComponentProps<typeof NativeText> & { className?: string },
) {
  return useCssElement(NativeText, props, { className: "style" });
}

export function Pressable(
  props: React.ComponentProps<typeof NativePressable> & { className?: string },
) {
  return useCssElement(NativePressable, props, { className: "style" });
}

export function ScrollView(
  props: React.ComponentProps<typeof NativeScrollView> & {
    className?: string;
    contentContainerClassName?: string;
  },
) {
  return useCssElement(NativeScrollView, props, {
    className: "style",
    contentContainerClassName: "contentContainerStyle",
  });
}

export function TextInput(
  props: React.ComponentProps<typeof NativeTextInput> & {
    className?: string;
  },
) {
  return useCssElement(NativeTextInput, props, { className: "style" });
}
