import Link from "next/link";
import { BarChart3, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function VerifyEmailPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500 text-white">
            <Mail className="h-7 w-7" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">
          E-postanızı Doğrulayın
        </CardTitle>
        <CardDescription className="text-base">
          Hesabınızı aktifleştirmek için e-posta adresinize gönderilen doğrulama
          linkine tıklayın.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted p-4">
          <h3 className="font-medium mb-2">Sonraki adımlar:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>E-posta gelen kutunuzu kontrol edin</li>
            <li>Spam/Junk klasörünü de kontrol edin</li>
            <li>Doğrulama linkine tıklayın</li>
            <li>Hesabınızla giriş yapın</li>
          </ol>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Link href="/auth/login" className="w-full">
          <Button className="w-full">
            <BarChart3 className="mr-2 h-4 w-4" />
            Giriş Sayfasına Git
          </Button>
        </Link>
        <p className="text-center text-sm text-muted-foreground">
          E-posta almadınız mı?{" "}
          <Link
            href="/auth/register"
            className="text-primary hover:underline font-medium"
          >
            Tekrar deneyin
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
