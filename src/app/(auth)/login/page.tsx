import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <Link
        href="/"
        className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        العودة للرئيسية
      </Link>

      <Card className="shadow-xl shadow-emerald-900/5">
        <CardHeader className="items-center text-center">
          <span className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25">
            <MessageCircle className="size-6" />
          </span>
          <CardTitle className="text-2xl">
            MediSync <span className="text-emerald-600">AI</span>
          </CardTitle>
          <CardDescription>
            سجّل الدخول للوصول إلى لوحة تحكم عيادتك
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        حسابات العيادات تُنشأ من إدارة المنصة — تواصل معنا إن لم يصلك حسابك.
      </p>
    </div>
  );
}
