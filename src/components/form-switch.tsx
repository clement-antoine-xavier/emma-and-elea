"use client";

import type {Control, FieldPath, FieldValues} from "react-hook-form";
import {Controller} from "react-hook-form";
import {Switch} from "@astryxdesign/core/Switch";

type FormSwitchProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
  isDisabled?: boolean;
};

export function FormSwitch<T extends FieldValues>({
  control,
  name,
  label,
  description,
  isDisabled,
}: FormSwitchProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({field}) => (
        <Switch
          label={label}
          description={description}
          value={Boolean(field.value)}
          onChange={(checked) => field.onChange(checked)}
          htmlName={name}
          isDisabled={isDisabled}
        />
      )}
    />
  );
}
