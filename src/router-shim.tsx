// Small adapter so pages keep a familiar API on top of react-router-dom.
import { forwardRef, type ComponentProps, type ComponentType } from "react";
import {
  Link as RLink,
  NavLink,
  Navigate as RNavigate,
  Outlet,
  useLocation,
  useNavigate as useRNavigate,
  useParams,
} from "react-router-dom";

export { Outlet, useLocation };

type Params = Record<string, string>;
const build = (to: string, params?: Params) =>
  params ? to.replace(/\$(\w+)/g, (_, k) => encodeURIComponent(params[k] ?? "")) : to;

type LinkProps = Omit<ComponentProps<typeof RLink>, "to"> & {
  to: string;
  params?: Params;
  activeProps?: { className?: string };
};
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ to, params, activeProps, className, ...rest }, ref) {
  if (activeProps)
    return (
      <NavLink
        ref={ref}
        to={build(to, params)}
        className={({ isActive }) => [className as string, isActive ? activeProps.className : ""].join(" ")}
        {...(rest as any)}
      />
    );
  return <RLink ref={ref} to={build(to, params)} className={className as string} {...rest} />;
});

export function Navigate({ to, params }: { to: string; params?: Params }) {
  return <RNavigate to={build(to, params)} replace />;
}

export function useNavigate() {
  const n = useRNavigate();
  return (o: { to: string; params?: Params }) => n(build(o.to, o.params));
}

export function createFileRoute(_path: string) {
  return <T extends { component: ComponentType }>(opts: T & Record<string, unknown>) => ({
    ...opts,
    useParams: () => useParams() as Params,
  });
}
