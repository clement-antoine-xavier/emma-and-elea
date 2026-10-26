"use client";

import type {Control, FieldPath, FieldValues} from "react-hook-form";
import {Controller} from "react-hook-form";
import {Selector} from "@astryxdesign/core/Selector";

export type FormSelectorOption = {
  value: string;
  label: string;
};

type FormSelectorProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  options: FormSelectorOption[];
  isRequired?: boolean;
  isDisabled?: boolean;
  description?: string;
};

export function FormSelector<T extends FieldValues>({
  control,
  name,
  label,
  options,
  isRequired,
  isDisabled,
  description,
}: FormSelectorProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({field, fieldState}) => (
        <Selector
          label={label}
          options={options}
          value={typeof field.value === "string" ? field.value : undefined}
          onChange={(value) => field.onChange(value)}
          htmlName={name}
          isRequired={isRequired}
          isDisabled={isDisabled}
          description={description}
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
