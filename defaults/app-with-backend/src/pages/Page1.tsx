// Components showcase — demonstrates a slice of @_linked/primitives against
// the active @_linked/css theme. Tweak tokens in src/theme.css to re-skin
// everything on this page. (To make the route sign-in-protected later, see
// the `requireAuth` line in src/routes.tsx.)
import React, { useEffect, useState } from 'react';
import { DefaultLayout } from '../layout/DefaultLayout';
import { Button } from '@_linked/primitives/components/Button';
import { Input } from '@_linked/primitives/components/Input';
import { Switch } from '@_linked/primitives/components/Switch';
import { Checkbox } from '@_linked/primitives/components/Checkbox';
import { Slider } from '@_linked/primitives/components/Slider';
import { Progress } from '@_linked/primitives/components/Progress';
import { Avatar } from '@_linked/primitives/components/Avatar';
import { Tabs } from '@_linked/primitives/components/Tabs';
import { RadioGroup } from '@_linked/primitives/components/RadioGroup';
import { Label } from '@_linked/primitives/components/Label';
import { Separator } from '@_linked/primitives/components/Separator';
import style from './Page1.module.css';

export default function Page1() {
  const [progress, setProgress] = useState(60);
  const [sliderValue, setSliderValue] = useState([40]);
  const [checked, setChecked] = useState(true);
  const [switchOn, setSwitchOn] = useState(true);
  const [radio, setRadio] = useState('comfy');
  const [text, setText] = useState('');
  // Radix Tabs use React 18 useId() which can drift between SSR (StaticRouter)
  // and CSR (BrowserRouter) trees and trigger an aria-controls hydration
  // mismatch warning. Render the showcase only after mount to side-step this.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <DefaultLayout>
      <div className={style.Page}>
        <header className={style.Header}>
          <h2>Components</h2>
          <p>
            A small tour of <code>@_linked/primitives</code> rendered against
            the active <code>@_linked/css</code> theme. Tweak{' '}
            <code>src/theme.css</code> tokens to re-skin every component on
            this page.
          </p>
        </header>

        {mounted && (
        <Tabs.Root defaultValue="forms" className={style.Tabs}>
          <Tabs.List>
            <Tabs.Trigger value="forms">Forms</Tabs.Trigger>
            <Tabs.Trigger value="display">Display</Tabs.Trigger>
            <Tabs.Trigger value="buttons">Buttons</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="forms" className={style.TabPanel}>
            <section className={style.Card}>
              <h3>Inputs</h3>
              <div className={style.Field}>
                <Label htmlFor="demo-name">Name</Label>
                <Input
                  id="demo-name"
                  placeholder="Ada Lovelace"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </div>
              <Separator />
              <div className={style.Row}>
                <Switch
                  checked={switchOn}
                  onCheckedChange={(v) => setSwitchOn(Boolean(v))}
                />
                <Label>Enable notifications</Label>
              </div>
              <div className={style.Row}>
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => setChecked(Boolean(v))}
                />
                <Label>I agree to the terms</Label>
              </div>
            </section>

            <section className={style.Card}>
              <h3>Density</h3>
              <RadioGroup.Root
                value={radio}
                onValueChange={setRadio}
                className={style.Stack}
              >
                <div className={style.Row}>
                  <RadioGroup.Item value="compact" id="r-compact" />
                  <Label htmlFor="r-compact">Compact</Label>
                </div>
                <div className={style.Row}>
                  <RadioGroup.Item value="comfy" id="r-comfy" />
                  <Label htmlFor="r-comfy">Comfortable</Label>
                </div>
                <div className={style.Row}>
                  <RadioGroup.Item value="spacious" id="r-spacious" />
                  <Label htmlFor="r-spacious">Spacious</Label>
                </div>
              </RadioGroup.Root>
            </section>

            <section className={style.Card}>
              <h3>Slider</h3>
              <Slider.Root
                value={sliderValue}
                onValueChange={setSliderValue}
                min={0}
                max={100}
                step={1}
              >
                <Slider.Track>
                  <Slider.Range />
                </Slider.Track>
                <Slider.Thumb />
              </Slider.Root>
              <p className={style.Hint}>Value: {sliderValue[0]}</p>
            </section>
          </Tabs.Content>

          <Tabs.Content value="display" className={style.TabPanel}>
            <section className={style.Card}>
              <h3>Avatar</h3>
              <div className={style.AvatarRow}>
                <Avatar.Root>
                  <Avatar.Fallback>AL</Avatar.Fallback>
                </Avatar.Root>
                <Avatar.Root>
                  <Avatar.Fallback>GH</Avatar.Fallback>
                </Avatar.Root>
                <Avatar.Root>
                  <Avatar.Fallback>RV</Avatar.Fallback>
                </Avatar.Root>
              </div>
            </section>

            <section className={style.Card}>
              <h3>Progress</h3>
              <Progress.Root value={progress} />
              <div className={style.Row}>
                <Button
                  size="small"
                  variant="outline"
                  onClick={() => setProgress((p) => Math.max(0, p - 10))}
                >
                  −10
                </Button>
                <Button
                  size="small"
                  variant="outline"
                  onClick={() => setProgress((p) => Math.min(100, p + 10))}
                >
                  +10
                </Button>
                <span className={style.Hint}>{progress}%</span>
              </div>
            </section>
          </Tabs.Content>

          <Tabs.Content value="buttons" className={style.TabPanel}>
            <section className={style.Card}>
              <h3>Variants</h3>
              <div className={style.ButtonRow}>
                <Button variant="solid">Solid</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
            </section>

            <section className={style.Card}>
              <h3>Colors</h3>
              <div className={style.ButtonRow}>
                <Button color="primary">Primary</Button>
                <Button color="secondary">Secondary</Button>
                <Button color="tertiary">Tertiary</Button>
              </div>
            </section>

            <section className={style.Card}>
              <h3>Sizes</h3>
              <div className={style.ButtonRow}>
                <Button size="small">Small</Button>
                <Button size="medium">Medium</Button>
                <Button size="large">Large</Button>
              </div>
            </section>
          </Tabs.Content>
        </Tabs.Root>
        )}
      </div>
    </DefaultLayout>
  );
}
