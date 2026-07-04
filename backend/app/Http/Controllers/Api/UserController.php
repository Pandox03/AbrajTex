<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    public function __construct(private ActivityLogger $logger) {}

    public function index(Request $request): JsonResponse
    {
        $query = User::query()->orderBy('name');

        if ($search = $request->string('search')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($role = $request->string('role')->toString()) {
            $query->where('role', $role);
        }

        return response()->json($query->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', Password::min(8)],
            'role' => ['required', Rule::in(['admin', 'secretaire', 'comptable'])],
        ]);

        $user = User::create($data);

        $this->logger->log(
            $request->user(),
            $request,
            'created',
            "Compte créé — {$user->name} ({$user->role})",
            'user',
            $user->id,
            ['email' => $user->email, 'role' => $user->role],
        );

        return response()->json($user, 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['sometimes', 'nullable', 'string', Password::min(8)],
            'role' => ['sometimes', Rule::in(['admin', 'secretaire', 'comptable'])],
        ]);

        if (isset($data['role']) && $data['role'] !== $user->role) {
            $this->guardLastAdmin($user, $data['role']);
        }

        if (empty($data['password'])) {
            unset($data['password']);
        }

        $user->update($data);

        $this->logger->log(
            $request->user(),
            $request,
            'updated',
            "Compte modifié — {$user->name}",
            'user',
            $user->id,
        );

        return response()->json($user->fresh());
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($request->user()->id === $user->id) {
            return response()->json(['message' => 'Vous ne pouvez pas supprimer votre propre compte.'], 422);
        }

        if ($user->isAdmin() && User::where('role', 'admin')->count() <= 1) {
            return response()->json(['message' => 'Impossible de supprimer le dernier administrateur.'], 422);
        }

        $name = $user->name;
        $id = $user->id;

        $user->tokens()->delete();
        $user->delete();

        $this->logger->log(
            $request->user(),
            $request,
            'deleted',
            "Compte supprimé — {$name}",
            'user',
            $id,
        );

        return response()->json(['message' => 'Utilisateur supprimé.']);
    }

    private function guardLastAdmin(User $user, string $newRole): void
    {
        if ($user->isAdmin() && $newRole === 'secretaire' && User::where('role', 'admin')->count() <= 1) {
            throw ValidationException::withMessages([
                'role' => ['Impossible de rétrograder le dernier administrateur.'],
            ]);
        }
    }
}
