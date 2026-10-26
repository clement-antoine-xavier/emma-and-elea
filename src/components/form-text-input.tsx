"use client";

import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { Controller } from "react-hook-form";
import { TextInput } from "@astryxdesign/core/TextInput";

type FormTextInputProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  isRequired?: boolean;
};

export function FormTextInput<T extends FieldValues>({
  control,
  name,
  label,
  type = "text",
  autoComplete,
  isRequired,
}: FormTextInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextInput
          label={label}
          type={type}
          value={typeof field.value === "string" ? field.value : ""}
          onChange={(value) => field.onChange(value)}
          htmlName={name}
          autoComplete={autoComplete}
          isRequired={isRequired}
          status={
            fieldState.error
              ? { type: "error", message: fieldState.error.message }
              : undefined
          }
        />
      )}
    />
  );
}
