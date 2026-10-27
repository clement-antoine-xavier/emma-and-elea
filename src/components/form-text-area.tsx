"use client";

import type {Control, FieldPath, FieldValues} from "react-hook-form";
import {Controller} from "react-hook-form";
import {TextArea} from "@astryxdesign/core/TextArea";

type FormTextAreaProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
  isRequired?: boolean;
};

export function FormTextArea<T extends FieldValues>({
  control,
  name,
  label,
  description,
  isRequired,
}: FormTextAreaProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({field, fieldState}) => (
        <TextArea
          label={label}
          description={description}
          value={typeof field.value === "string" ? field.value : ""}
          onChange={(value) => field.onChange(value)}
          htmlName={name}
          isRequired={isRequired}
          status={
            fieldState.error
              ? {type: "error", message: fieldState.error.message}
              : undefined
          }
        />
      )}
    />
  );
}
